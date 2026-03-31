<?php

namespace Tests\Feature;

use App\Contracts\AiProviderInterface;
use App\Exceptions\AiProviderException;
use App\Models\AiTriageMessage;
use App\Models\Clinic;
use App\Models\DoctorClinicSpecialty;
use App\Models\DoctorInfor;
use App\Models\Schedule;
use App\Models\Specialty;
use App\Models\User;
use Carbon\Carbon;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PatientAiTriageTest extends TestCase
{
    use RefreshDatabase;

    private User $patient;
    private Specialty $cardiology;
    private Specialty $dermatology;
    private Clinic $londonClinic;
    private Clinic $manchesterClinic;
    private User $cardioDoctor;
    private User $dermaDoctor;
    private string $bookingDate;

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow(Carbon::parse('2026-03-29 23:30:00', 'Europe/London'));

        config([
            'services.ai_triage.enabled' => true,
            'services.ai_triage.api_key' => 'test-key',
        ]);

        $this->seed(RoleSeeder::class);

        $this->patient = User::factory()->create([
            'roleId' => 'R3',
        ]);
        $this->patient->assignRole('R3');

        $this->cardiology = Specialty::factory()->create([
            'name' => 'Cardiology',
        ]);
        $this->dermatology = Specialty::factory()->create([
            'name' => 'Dermatology',
        ]);

        $this->londonClinic = Clinic::factory()->create([
            'name' => 'London Heart Clinic',
            'address' => 'London Bridge, London',
        ]);
        $this->manchesterClinic = Clinic::factory()->create([
            'name' => 'Manchester Skin Studio',
            'address' => 'Manchester City Centre',
        ]);

        $this->cardioDoctor = $this->createDoctor(
            'Dr Cardio',
            $this->cardiology,
            $this->londonClinic
        );
        $this->dermaDoctor = $this->createDoctor(
            'Dr Skin',
            $this->dermatology,
            $this->manchesterClinic
        );

        $this->bookingDate = now('Europe/London')->addDay()->toDateString();

        Schedule::create([
            'doctorId' => $this->cardioDoctor->id,
            'date' => $this->bookingDate,
            'timeType' => 'T1',
            'currentNumber' => 0,
            'isActive' => true,
        ]);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    public function test_patient_auth_is_required_for_triage_endpoints(): void
    {
        $this->postJson('/api/patient/ai/triage/sessions')
            ->assertStatus(401);
    }

    public function test_patient_can_create_ai_triage_session_and_persist_metadata(): void
    {
        $this->bindAiProviderReturning([
            'provider' => 'test',
            'model' => 'fake-model',
            'assistantMessage' => 'This should not be used on session creation.',
            'triage' => [],
        ]);

        $response = $this->actingAs($this->patient, 'sanctum')
            ->postJson('/api/patient/ai/triage/sessions');

        $response->assertCreated()
            ->assertJsonStructure([
                'sessionId',
                'assistantMessage',
                'disclaimer',
            ]);

        $this->assertDatabaseHas('ai_triage_sessions', [
            'id' => $response->json('sessionId'),
            'patientId' => $this->patient->id,
            'status' => 'active',
        ]);

        $this->assertDatabaseHas('ai_triage_messages', [
            'sessionId' => $response->json('sessionId'),
            'role' => 'assistant',
        ]);
    }

    public function test_message_submission_persists_transcript_and_structured_output(): void
    {
        $this->bindAiProviderReturning($this->urgentCardiologyResponse());

        $sessionId = $this->actingAs($this->patient, 'sanctum')
            ->postJson('/api/patient/ai/triage/sessions')
            ->json('sessionId');

        $response = $this->actingAs($this->patient, 'sanctum')
            ->postJson("/api/patient/ai/triage/sessions/{$sessionId}/messages", [
                'message' => 'Chest tightness since this morning. My number is +44 7700 900123 and I prefer London Bridge.',
            ]);

        $response->assertOk()
            ->assertJsonPath('triage.urgency', 'urgent')
            ->assertJsonPath('recommendations.slotRecommendations.0.doctorId', $this->cardioDoctor->id);

        $userMessage = AiTriageMessage::query()
            ->where('sessionId', $sessionId)
            ->where('role', 'user')
            ->latest('id')
            ->first();

        $assistantMessage = AiTriageMessage::query()
            ->where('sessionId', $sessionId)
            ->where('role', 'assistant')
            ->whereNotNull('structuredOutput')
            ->latest('id')
            ->first();

        $this->assertNotNull($userMessage);
        $this->assertNotNull($assistantMessage);
        $this->assertStringContainsString('[redacted-phone]', (string) $userMessage?->content);
        $this->assertSame('urgent', data_get($assistantMessage?->structuredOutput, 'triage.urgency'));
        $this->assertSame($this->cardioDoctor->id, data_get($assistantMessage?->structuredOutput, 'recommendations.slotRecommendations.0.doctorId'));
    }

    public function test_emergency_response_returns_no_booking_recommendations(): void
    {
        $this->bindAiProviderReturning([
            'provider' => 'test',
            'model' => 'fake-model',
            'assistantMessage' => 'This could be an emergency. Please seek urgent in-person care now.',
            'triage' => [
                'urgency' => 'emergency',
                'explanation' => 'Severe chest pain and trouble breathing may need urgent in-person care.',
                'redFlags' => ['chest pain', 'shortness of breath'],
                'symptomSummary' => 'Severe chest pain with breathing difficulty.',
                'specialtyCandidates' => [
                    ['name' => 'Cardiology', 'reason' => 'Heart-related symptoms.', 'confidence' => 0.94],
                ],
                'locationHints' => ['London'],
                'reasonForVisit' => 'Severe chest pain with breathing difficulty.',
            ],
        ]);

        $sessionId = $this->actingAs($this->patient, 'sanctum')
            ->postJson('/api/patient/ai/triage/sessions')
            ->json('sessionId');

        $response = $this->actingAs($this->patient, 'sanctum')
            ->postJson("/api/patient/ai/triage/sessions/{$sessionId}/messages", [
                'message' => 'I have crushing chest pain and cannot breathe properly.',
            ]);

        $response->assertOk()
            ->assertJsonPath('triage.urgency', 'emergency')
            ->assertJsonCount(0, 'recommendations.doctorRecommendations')
            ->assertJsonCount(0, 'recommendations.slotRecommendations')
            ->assertJsonPath('recommendations.prefill', null);
    }

    public function test_urgent_response_returns_specialty_matched_doctors_with_open_slots(): void
    {
        $this->bindAiProviderReturning($this->urgentCardiologyResponse());

        $sessionId = $this->actingAs($this->patient, 'sanctum')
            ->postJson('/api/patient/ai/triage/sessions')
            ->json('sessionId');

        $response = $this->actingAs($this->patient, 'sanctum')
            ->postJson("/api/patient/ai/triage/sessions/{$sessionId}/messages", [
                'message' => 'Shortness of breath when walking and I prefer somewhere around London Bridge.',
            ]);

        $response->assertOk()
            ->assertJsonPath('triage.specialtyCandidates.0.name', 'Cardiology')
            ->assertJsonPath('recommendations.doctorRecommendations.0.doctorId', $this->cardioDoctor->id)
            ->assertJsonPath('recommendations.slotRecommendations.0.doctorId', $this->cardioDoctor->id)
            ->assertJsonPath('recommendations.slotRecommendations.0.date', $this->bookingDate);
    }

    public function test_greeting_only_message_returns_no_triage_status_or_recommendations(): void
    {
        $this->bindAiProviderReturning($this->urgentCardiologyResponse());

        $sessionId = $this->actingAs($this->patient, 'sanctum')
            ->postJson('/api/patient/ai/triage/sessions')
            ->json('sessionId');

        $response = $this->actingAs($this->patient, 'sanctum')
            ->postJson("/api/patient/ai/triage/sessions/{$sessionId}/messages", [
                'message' => 'Hello',
            ]);

        $response->assertOk()
            ->assertJsonPath('triage.readyForAssessment', false)
            ->assertJsonPath('triage.needsMoreInformation', true)
            ->assertJsonPath('triage.urgency', null)
            ->assertJsonCount(0, 'triage.specialtyCandidates')
            ->assertJsonCount(0, 'recommendations.doctorRecommendations')
            ->assertJsonCount(0, 'recommendations.slotRecommendations')
            ->assertJsonPath('recommendations.prefill', null);
    }

    public function test_provider_failure_returns_safe_retryable_error_without_bogus_assistant_output(): void
    {
        $this->app->instance(AiProviderInterface::class, new class implements AiProviderInterface
        {
            public function analyzeConversation(array $messages, array $context = []): array
            {
                throw new AiProviderException('Upstream failure');
            }
        });

        $sessionId = $this->actingAs($this->patient, 'sanctum')
            ->postJson('/api/patient/ai/triage/sessions')
            ->json('sessionId');

        $response = $this->actingAs($this->patient, 'sanctum')
            ->postJson("/api/patient/ai/triage/sessions/{$sessionId}/messages", [
                'message' => 'A worrying symptom message.',
            ]);

        $response->assertStatus(503)
            ->assertJson([
                'message' => 'AI triage is unavailable right now. Please try again shortly.',
            ]);

        $this->assertDatabaseCount('ai_triage_messages', 2);
        $this->assertDatabaseMissing('ai_triage_messages', [
            'sessionId' => $sessionId,
            'role' => 'assistant',
            'providerName' => 'test',
        ]);
    }

    private function createDoctor(string $name, Specialty $specialty, Clinic $clinic): User
    {
        $doctor = User::factory()->create([
            'name' => $name,
            'roleId' => 'R2',
            'isActive' => true,
        ]);
        $doctor->assignRole('R2');

        DoctorInfor::create([
            'doctorId' => $doctor->id,
            'addressClinic' => $clinic->address,
            'nameClinic' => $clinic->name,
            'note' => "{$specialty->name} consultations",
        ]);

        DoctorClinicSpecialty::create([
            'doctorId' => $doctor->id,
            'clinicId' => $clinic->id,
            'specialtyId' => $specialty->id,
        ]);

        return $doctor;
    }

    /**
     * @param array<string, mixed> $response
     */
    private function bindAiProviderReturning(array $response): void
    {
        $this->app->instance(AiProviderInterface::class, new class($response) implements AiProviderInterface
        {
            /**
             * @param array<string, mixed> $response
             */
            public function __construct(private readonly array $response)
            {
            }

            public function analyzeConversation(array $messages, array $context = []): array
            {
                return $this->response;
            }
        });
    }

    /**
     * @return array<string, mixed>
     */
    private function urgentCardiologyResponse(): array
    {
        return [
            'provider' => 'test',
            'model' => 'fake-model',
            'assistantMessage' => 'These symptoms look heart-related and should be checked promptly. I found a cardiology option near London Bridge.',
            'triage' => [
                'urgency' => 'urgent',
                'explanation' => 'Breathlessness and chest tightness can need prompt review.',
                'redFlags' => ['chest tightness'],
                'symptomSummary' => 'Chest tightness with shortness of breath.',
                'specialtyCandidates' => [
                    ['name' => 'Cardiology', 'reason' => 'Heart-related symptoms.', 'confidence' => 0.96],
                    ['name' => 'Dermatology', 'reason' => 'Low-confidence fallback.', 'confidence' => 0.12],
                ],
                'locationHints' => ['London Bridge'],
                'reasonForVisit' => 'Chest tightness with shortness of breath.',
            ],
        ];
    }
}
