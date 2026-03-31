<?php

namespace App\Services\Ai;

use App\Contracts\AiProviderInterface;
use App\Exceptions\AiProviderException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use JsonException;

class OpenAiTriageProvider implements AiProviderInterface
{
    public function analyzeConversation(array $messages, array $context = []): array
    {
        $apiKey = (string) config('services.ai_triage.api_key');
        if ($apiKey === '') {
            throw new AiProviderException('AI triage provider is not configured.');
        }

        $baseUrl = rtrim((string) config('services.ai_triage.base_url'), '/');
        $model = (string) config('services.ai_triage.model');
        $timeout = (int) config('services.ai_triage.timeout', 25);

        try {
            $response = Http::baseUrl($baseUrl)
                ->withToken($apiKey)
                ->acceptJson()
                ->timeout($timeout)
                ->post('/responses', [
                    'model' => $model,
                    'input' => $this->buildInputMessages($messages, $context),
                    'text' => [
                        'format' => $this->responseFormat(),
                    ],
                    'max_output_tokens' => 1200,
                ]);
        } catch (ConnectionException $exception) {
            throw new AiProviderException('AI triage provider connection failed.', 0, $exception);
        }

        if (!$response->successful()) {
            $providerMessage = trim((string) ($response->json('error.message') ?? ''));
            $status = $response->status();

            if ($providerMessage !== '') {
                throw new AiProviderException("AI triage provider request failed with status {$status}: {$providerMessage}");
            }

            throw new AiProviderException("AI triage provider request failed with status {$status}.");
        }

        $outputText = $response->json('output_text');
        if (!is_string($outputText) || trim($outputText) === '') {
            $outputText = $this->extractOutputText($response->json('output'));
        }

        if ($outputText === null || trim($outputText) === '') {
            throw new AiProviderException('AI triage provider returned an empty response.');
        }

        try {
            /** @var array<string, mixed> $decoded */
            $decoded = json_decode($outputText, true, 512, JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            throw new AiProviderException('AI triage provider returned invalid structured output.');
        }

        return [
            'provider' => 'openai',
            'model' => $model,
            'assistantMessage' => (string) ($decoded['assistantMessage'] ?? ''),
            'triage' => [
                'needsMoreInformation' => (bool) ($decoded['needsMoreInformation'] ?? false),
                'urgency' => (string) ($decoded['urgency'] ?? 'medium'),
                'explanation' => (string) ($decoded['explanation'] ?? ''),
                'redFlags' => array_values(array_filter(array_map('strval', $decoded['redFlags'] ?? []))),
                'symptomSummary' => (string) ($decoded['symptomSummary'] ?? ''),
                'specialtyCandidates' => array_values(array_filter(
                    is_array($decoded['specialtyCandidates'] ?? null) ? $decoded['specialtyCandidates'] : [],
                    fn ($item) => is_array($item)
                )),
                'locationHints' => array_values(array_filter(array_map('strval', $decoded['locationHints'] ?? []))),
                'reasonForVisit' => (string) ($decoded['reasonForVisit'] ?? ''),
            ],
        ];
    }

    /**
     * @param array<int, array{role:string, content:string}> $messages
     * @param array<string, mixed> $context
     * @return array<int, array<string, mixed>>
     */
    private function buildInputMessages(array $messages, array $context): array
    {
        $input = [[
            'role' => 'system',
            'content' => [[
                'type' => 'input_text',
                'text' => $this->buildSystemPrompt($context),
            ]],
        ]];

        foreach ($messages as $message) {
            $content = trim((string) ($message['content'] ?? ''));
            if ($content === '') {
                continue;
            }

            $role = ($message['role'] ?? 'user') === 'assistant' ? 'assistant' : 'user';
            $input[] = [
                'role' => $role,
                'content' => [[
                    'type' => $role === 'assistant' ? 'output_text' : 'input_text',
                    'text' => $content,
                ]],
            ];
        }

        return $input;
    }

    /**
     * @param array<string, mixed> $context
     */
    private function buildSystemPrompt(array $context): string
    {
        $specialtyNames = collect($context['specialties'] ?? [])
            ->map(fn ($specialty) => is_array($specialty) ? ($specialty['name'] ?? null) : null)
            ->filter()
            ->values()
            ->all();

        $knowledgeLines = collect($context['knowledge'] ?? [])
            ->map(function ($entry): ?string {
                if (!is_array($entry)) {
                    return null;
                }

                $title = trim((string) ($entry['title'] ?? ''));
                $content = trim((string) ($entry['content'] ?? ''));
                if ($title === '' && $content === '') {
                    return null;
                }

                return trim("{$title}: {$content}");
            })
            ->filter()
            ->values()
            ->all();

        $specialtyList = $specialtyNames === []
            ? 'No catalog specialties were provided.'
            : implode(', ', $specialtyNames);
        $knowledgeContext = $knowledgeLines === []
            ? 'No local knowledge context was provided.'
            : implode("\n", $knowledgeLines);

        return <<<PROMPT
You are the HealthSync patient triage assistant for a UK booking platform.

Rules:
- You are advisory only. You do not diagnose disease.
- Always classify urgency as one of: low, medium, urgent, emergency.
- Use emergency when the symptoms suggest possible stroke, heart attack, severe trouble breathing, loss of consciousness, severe bleeding, seizure, or other immediate danger.
- If the patient describes an emergency, tell them to seek urgent in-person care now and do not suggest booking shortcuts.
- If the patient only greets you, makes small talk, says thanks, or has not yet described symptoms clearly enough to assess, set needsMoreInformation to true and ask one short follow-up question instead of giving a clinical assessment.
- When needsMoreInformation is true, keep specialtyCandidates empty and keep redFlags, symptomSummary, and reasonForVisit empty.
- Prefer specialty names from this HealthSync catalog when possible: {$specialtyList}
- Extract location hints only if the patient explicitly mentions a city, area, or clinic preference.
- Do not ask for or retain contact details. The conversation you receive is already redacted.
- Keep assistantMessage concise, calm, and suitable for patients.

Return JSON only that matches the provided schema.

Local HealthSync knowledge:
{$knowledgeContext}
PROMPT;
    }

    /**
     * @return array<string, mixed>
     */
    private function responseFormat(): array
    {
        return [
            'type' => 'json_schema',
            'name' => 'healthsync_triage_response',
            'strict' => true,
            'schema' => [
                'type' => 'object',
                'additionalProperties' => false,
                'required' => [
                    'assistantMessage',
                    'needsMoreInformation',
                    'urgency',
                    'explanation',
                    'redFlags',
                    'symptomSummary',
                    'specialtyCandidates',
                    'locationHints',
                    'reasonForVisit',
                ],
                'properties' => [
                    'assistantMessage' => [
                        'type' => 'string',
                    ],
                    'needsMoreInformation' => [
                        'type' => 'boolean',
                    ],
                    'urgency' => [
                        'type' => 'string',
                        'enum' => ['low', 'medium', 'urgent', 'emergency'],
                    ],
                    'explanation' => [
                        'type' => 'string',
                    ],
                    'redFlags' => [
                        'type' => 'array',
                        'items' => [
                            'type' => 'string',
                        ],
                    ],
                    'symptomSummary' => [
                        'type' => 'string',
                    ],
                    'specialtyCandidates' => [
                        'type' => 'array',
                        'items' => [
                            'type' => 'object',
                            'additionalProperties' => false,
                            'required' => ['name', 'reason', 'confidence'],
                            'properties' => [
                                'name' => ['type' => 'string'],
                                'reason' => ['type' => 'string'],
                                'confidence' => ['type' => 'number'],
                            ],
                        ],
                    ],
                    'locationHints' => [
                        'type' => 'array',
                        'items' => [
                            'type' => 'string',
                        ],
                    ],
                    'reasonForVisit' => [
                        'type' => 'string',
                    ],
                ],
            ],
        ];
    }

    /**
     * @param mixed $output
     */
    private function extractOutputText(mixed $output): ?string
    {
        if (!is_array($output)) {
            return null;
        }

        foreach ($output as $item) {
            if (!is_array($item)) {
                continue;
            }

            foreach (($item['content'] ?? []) as $content) {
                if (!is_array($content)) {
                    continue;
                }

                if (($content['type'] ?? null) === 'output_text' && is_string($content['text'] ?? null)) {
                    return $content['text'];
                }
            }
        }

        return null;
    }
}
