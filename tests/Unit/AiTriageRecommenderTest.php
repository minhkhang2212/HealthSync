<?php

namespace Tests\Unit;

use App\Models\Clinic;
use App\Models\DoctorClinicSpecialty;
use App\Models\DoctorInfor;
use App\Models\Schedule;
use App\Models\Specialty;
use App\Models\User;
use App\Services\Ai\AiTriageRecommender;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AiTriageRecommenderTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Carbon::setTestNow(Carbon::parse('2026-03-29 23:30:00', 'Europe/London'));
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    public function test_it_prioritizes_specialty_and_location_matches(): void
    {
        $cardiology = Specialty::factory()->create(['name' => 'Cardiology']);
        $dermatology = Specialty::factory()->create(['name' => 'Dermatology']);
        $londonClinic = Clinic::factory()->create(['name' => 'London Heart Clinic', 'address' => 'London Bridge']);
        $manchesterClinic = Clinic::factory()->create(['name' => 'Manchester Skin Studio', 'address' => 'Manchester']);

        $cardioDoctor = $this->createDoctor('Dr Cardio', $cardiology, $londonClinic);
        $this->createDoctor('Dr Skin', $dermatology, $manchesterClinic);

        Schedule::create([
            'doctorId' => $cardioDoctor->id,
            'date' => now('Europe/London')->addDay()->toDateString(),
            'timeType' => 'T1',
            'currentNumber' => 0,
            'isActive' => true,
        ]);

        $service = new AiTriageRecommender();

        $result = $service->build([
            'urgency' => 'urgent',
            'explanation' => 'Prompt review is sensible.',
            'redFlags' => [],
            'symptomSummary' => 'Chest tightness with exertion.',
            'specialtyCandidates' => [
                ['name' => 'Cardiology', 'reason' => 'Heart-related symptoms.', 'confidence' => 0.95],
            ],
            'locationHints' => ['London'],
            'reasonForVisit' => 'Chest tightness with exertion.',
        ]);

        $this->assertSame('Cardiology', data_get($result, 'triage.specialtyCandidates.0.name'));
        $this->assertSame($cardioDoctor->id, data_get($result, 'recommendations.doctorRecommendations.0.doctorId'));
    }

    public function test_emergency_branch_returns_no_recommendations(): void
    {
        $service = new AiTriageRecommender();

        $result = $service->build([
            'urgency' => 'emergency',
            'explanation' => 'Emergency care may be needed.',
            'redFlags' => ['severe breathing difficulty'],
            'symptomSummary' => 'Severe breathing difficulty.',
            'specialtyCandidates' => [
                ['name' => 'Cardiology', 'reason' => 'Potential acute chest issue.', 'confidence' => 0.98],
            ],
            'locationHints' => ['London'],
            'reasonForVisit' => 'Severe breathing difficulty.',
        ]);

        $this->assertSame('emergency', data_get($result, 'triage.urgency'));
        $this->assertSame([], data_get($result, 'recommendations.doctorRecommendations'));
        $this->assertSame([], data_get($result, 'recommendations.slotRecommendations'));
        $this->assertNull(data_get($result, 'recommendations.prefill'));
    }

    public function test_it_returns_a_neutral_state_when_more_information_is_needed(): void
    {
        $service = new AiTriageRecommender();

        $result = $service->build([
            'needsMoreInformation' => true,
            'urgency' => 'medium',
            'explanation' => '',
            'redFlags' => [],
            'symptomSummary' => '',
            'specialtyCandidates' => [
                ['name' => 'Cardiology', 'reason' => 'Should be ignored.', 'confidence' => 0.91],
            ],
            'locationHints' => ['London'],
            'reasonForVisit' => '',
        ]);

        $this->assertFalse(data_get($result, 'triage.readyForAssessment'));
        $this->assertTrue(data_get($result, 'triage.needsMoreInformation'));
        $this->assertNull(data_get($result, 'triage.urgency'));
        $this->assertSame([], data_get($result, 'triage.specialtyCandidates'));
        $this->assertSame([], data_get($result, 'recommendations.doctorRecommendations'));
        $this->assertSame([], data_get($result, 'recommendations.slotRecommendations'));
        $this->assertNull(data_get($result, 'recommendations.prefill'));
    }

    private function createDoctor(string $name, Specialty $specialty, Clinic $clinic): User
    {
        $doctor = User::factory()->create([
            'name' => $name,
            'roleId' => 'R2',
            'isActive' => true,
        ]);

        DoctorInfor::create([
            'doctorId' => $doctor->id,
            'addressClinic' => $clinic->address,
            'nameClinic' => $clinic->name,
        ]);

        DoctorClinicSpecialty::create([
            'doctorId' => $doctor->id,
            'clinicId' => $clinic->id,
            'specialtyId' => $specialty->id,
        ]);

        return $doctor;
    }
}
