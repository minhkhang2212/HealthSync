<?php

namespace App\Services\Ai;

use App\Contracts\AiProviderInterface;
use App\Contracts\KnowledgeRetrieverInterface;
use App\Exceptions\AiProviderException;
use App\Models\AiTriageMessage;
use App\Models\AiTriageSession;
use App\Models\Specialty;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class AiTriageService
{
    private const SESSION_GREETING = 'Tell me about your symptoms, when they started, and any location preference. I can suggest a specialty and booking options, but I cannot diagnose emergencies.';
    private const DISCLAIMER = 'AI triage is advisory only and does not replace urgent medical care or a clinician diagnosis.';
    private const SOCIAL_ONLY_PATTERNS = [
        '/^(hi|hello|hey|yo|sup|alo|xin chao|chao)(?:\s+there)?[!.?]*$/i',
        '/^good\s+(morning|afternoon|evening)[!.?]*$/i',
        '/^(thanks|thank you|thankyou|ok|okay|cool|nice|great|test)[!.?]*$/i',
        '/^(can you help|help me|are you there|what can you do|i need help)[!.?]*$/i',
    ];

    public function __construct(
        private readonly AiProviderInterface $provider,
        private readonly KnowledgeRetrieverInterface $knowledgeRetriever,
        private readonly TriagePiiRedactor $piiRedactor,
        private readonly AiTriageRecommender $recommender,
    ) {}

    /**
     * @return array{sessionId:int, assistantMessage:string, disclaimer:string}
     */
    public function createSession(int $patientId): array
    {
        $this->assertEnabled();

        $session = AiTriageSession::query()->create([
            'patientId' => $patientId,
            'status' => 'active',
        ]);

        $session->messages()->create([
            'role' => 'assistant',
            'content' => self::SESSION_GREETING,
        ]);

        return [
            'sessionId' => (int) $session->id,
            'assistantMessage' => self::SESSION_GREETING,
            'disclaimer' => self::DISCLAIMER,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function processUserMessage(int $sessionId, int $patientId, string $message): array
    {
        $this->assertEnabled();

        $session = $this->findSession($sessionId, $patientId);
        $redactedMessage = $this->piiRedactor->redact($message);

        $session->messages()->create([
            'role' => 'user',
            'content' => $redactedMessage,
        ]);

        $conversation = $session->messages()
            ->orderBy('id')
            ->get(['role', 'content'])
            ->map(fn (AiTriageMessage $messageRow) => [
                'role' => (string) $messageRow->role,
                'content' => (string) ($messageRow->content ?? ''),
            ])
            ->all();

        $specialties = Specialty::query()
            ->select(['id', 'name', 'description'])
            ->get()
            ->map(fn (Specialty $specialty) => [
                'id' => (int) $specialty->id,
                'name' => (string) $specialty->name,
                'description' => (string) ($specialty->description ?? ''),
            ])
            ->all();

        $knowledge = $this->knowledgeRetriever->retrieve([
            'patientId' => $patientId,
            'sessionId' => $sessionId,
            'specialties' => $specialties,
        ]);

        $startedAt = microtime(true);

        try {
            $providerResult = $this->provider->analyzeConversation($conversation, [
                'specialties' => $specialties,
                'knowledge' => $knowledge,
            ]);
        } catch (AiProviderException $exception) {
            Log::warning('ai_triage.provider_failed', [
                'session_id' => $sessionId,
                'patient_id' => $patientId,
                'message' => $exception->getMessage(),
            ]);

            throw new HttpException(503, 'AI triage is unavailable right now. Please try again shortly.');
        }

        $latencyMs = (int) round((microtime(true) - $startedAt) * 1000);
        $triage = $this->normalizeTriageResult($providerResult['triage'] ?? [], $redactedMessage);
        $recommendationResult = $this->recommender->build($triage);

        $structuredOutput = [
            'triage' => $recommendationResult['triage'],
            'recommendations' => $recommendationResult['recommendations'],
        ];

        $session->messages()->create([
            'role' => 'assistant',
            'content' => (string) ($providerResult['assistantMessage'] ?? ''),
            'providerName' => (string) ($providerResult['provider'] ?? ''),
            'providerModel' => (string) ($providerResult['model'] ?? ''),
            'latencyMs' => $latencyMs,
            'structuredOutput' => $structuredOutput,
        ]);

        Log::info('ai_triage.completed', [
            'session_id' => $sessionId,
            'patient_id' => $patientId,
            'latency_ms' => $latencyMs,
            'urgency' => $recommendationResult['triage']['urgency'] ?? 'unknown',
            'provider' => $providerResult['provider'] ?? null,
            'model' => $providerResult['model'] ?? null,
        ]);

        return [
            'assistantMessage' => (string) ($providerResult['assistantMessage'] ?? ''),
            'triage' => $recommendationResult['triage'],
            'recommendations' => $recommendationResult['recommendations'],
            'disclaimer' => self::DISCLAIMER,
        ];
    }

    private function assertEnabled(): void
    {
        if (!(bool) config('services.ai_triage.enabled')) {
            throw new NotFoundHttpException();
        }
    }

    /**
     * @param array<string, mixed> $triage
     * @return array<string, mixed>
     */
    private function normalizeTriageResult(array $triage, string $latestMessage): array
    {
        $needsMoreInformation = (bool) ($triage['needsMoreInformation'] ?? false);

        if ($this->isSocialOnlyMessage($latestMessage)) {
            $needsMoreInformation = true;
        }

        $triage['needsMoreInformation'] = $needsMoreInformation;

        if ($needsMoreInformation) {
            $triage['explanation'] = '';
            $triage['redFlags'] = [];
            $triage['symptomSummary'] = '';
            $triage['specialtyCandidates'] = [];
            $triage['locationHints'] = [];
            $triage['reasonForVisit'] = '';
        }

        return $triage;
    }

    private function isSocialOnlyMessage(string $message): bool
    {
        $normalized = preg_replace('/\s+/', ' ', trim(mb_strtolower($message)));
        $normalized = is_string($normalized) ? trim($normalized) : '';

        if ($normalized === '') {
            return true;
        }

        foreach (self::SOCIAL_ONLY_PATTERNS as $pattern) {
            if (preg_match($pattern, $normalized) === 1) {
                return true;
            }
        }

        return false;
    }

    private function findSession(int $sessionId, int $patientId): AiTriageSession
    {
        $session = AiTriageSession::query()
            ->where('id', $sessionId)
            ->where('patientId', $patientId)
            ->first();

        if (!$session) {
            throw new NotFoundHttpException('AI triage session not found.');
        }

        return $session;
    }
}
