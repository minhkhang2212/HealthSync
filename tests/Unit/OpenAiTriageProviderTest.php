<?php

namespace Tests\Unit;

use App\Exceptions\AiProviderException;
use App\Services\Ai\OpenAiTriageProvider;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class OpenAiTriageProviderTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.ai_triage.api_key' => 'test-key',
            'services.ai_triage.base_url' => 'https://api.openai.com/v1',
            'services.ai_triage.model' => 'gpt-4.1-mini',
            'services.ai_triage.timeout' => 25,
        ]);
    }

    public function test_it_sends_assistant_history_as_output_text(): void
    {
        Http::fake([
            'https://api.openai.com/v1/responses' => Http::response([
                'output_text' => json_encode([
                    'assistantMessage' => 'Prompt clinical follow-up is sensible.',
                    'urgency' => 'urgent',
                    'explanation' => 'Chest symptoms should be reviewed urgently.',
                    'redFlags' => ['chest tightness'],
                    'symptomSummary' => 'Chest tightness since this morning.',
                    'specialtyCandidates' => [
                        ['name' => 'Cardiology', 'reason' => 'Heart-related symptoms.', 'confidence' => 0.96],
                    ],
                    'locationHints' => ['London Bridge'],
                    'reasonForVisit' => 'Chest tightness since this morning.',
                ], JSON_THROW_ON_ERROR),
            ], 200),
        ]);

        $provider = new OpenAiTriageProvider();

        $provider->analyzeConversation([
            ['role' => 'assistant', 'content' => 'Tell me about your symptoms.'],
            ['role' => 'user', 'content' => 'I have chest tightness near London Bridge.'],
        ], [
            'specialties' => [
                ['name' => 'Cardiology'],
            ],
            'knowledge' => [],
        ]);

        Http::assertSent(function ($request) {
            $payload = $request->data();

            return data_get($payload, 'input.1.role') === 'assistant'
                && data_get($payload, 'input.1.content.0.type') === 'output_text'
                && data_get($payload, 'input.2.content.0.type') === 'input_text';
        });
    }

    public function test_it_includes_provider_status_and_message_when_request_fails(): void
    {
        Http::fake([
            'https://api.openai.com/v1/responses' => Http::response([
                'error' => [
                    'message' => 'Invalid request payload.',
                ],
            ], 400),
        ]);

        $provider = new OpenAiTriageProvider();

        $this->expectException(AiProviderException::class);
        $this->expectExceptionMessage('status 400: Invalid request payload.');

        $provider->analyzeConversation([
            ['role' => 'user', 'content' => 'A symptom message.'],
        ]);
    }
}
