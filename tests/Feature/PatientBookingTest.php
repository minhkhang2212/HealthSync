<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PatientBookingTest extends TestCase
{
    use RefreshDatabase;

    private User $patient;
    private User $doctor;
    private string $bookingDate;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);

        $this->patient = User::factory()->create(['roleId' => 'R3']);
        $this->patient->assignRole('R3');

        $this->doctor = User::factory()->create(['roleId' => 'R2']);
        $this->doctor->assignRole('R2');

        $this->bookingDate = now('Europe/London')->addDay()->toDateString();
    }

    public function test_patient_can_create_booking(): void
    {
        \App\Models\Schedule::insert([
            'doctorId' => $this->doctor->id,
            'date' => $this->bookingDate,
            'timeType' => 'T1',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $response = $this->actingAs($this->patient, 'sanctum')
            ->postJson('/api/patient/bookings', [
                'doctorId' => $this->doctor->id,
                'date' => $this->bookingDate,
                'timeType' => 'T1',
                'patientContactEmail' => 'booking-mail@example.com',
            ]);

        $response->assertStatus(201)
            ->assertJsonFragment(['doctorId' => $this->doctor->id]);

        $this->assertDatabaseHas('booking', [
            'patientId' => $this->patient->id,
            'doctorId' => $this->doctor->id,
            'statusId' => 'S1', // New status
            'patientContactEmail' => 'booking-mail@example.com',
        ]);
    }

    public function test_booking_validation_fails_without_doctor(): void
    {
        $response = $this->actingAs($this->patient, 'sanctum')
            ->postJson('/api/patient/bookings', [
                'date' => $this->bookingDate,
                'timeType' => 'T1',
                'patientContactEmail' => 'booking-mail@example.com',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['doctorId']);
    }

    public function test_booking_validation_fails_without_contact_email(): void
    {
        $response = $this->actingAs($this->patient, 'sanctum')
            ->postJson('/api/patient/bookings', [
                'doctorId' => $this->doctor->id,
                'date' => $this->bookingDate,
                'timeType' => 'T1',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['patientContactEmail']);
    }

    public function test_patient_can_list_their_bookings(): void
    {
        // Add a dummy factory call manually to simulate existing bookings
        \App\Models\Booking::insert([
            'statusId' => 'S1',
            'doctorId' => $this->doctor->id,
            'patientId' => $this->patient->id,
            'date' => $this->bookingDate,
            'timeType' => 'T1',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $response = $this->actingAs($this->patient, 'sanctum')
            ->getJson('/api/patient/bookings');

        $response->assertOk()
            ->assertJsonCount(1)
            ->assertJsonFragment(['patientId' => $this->patient->id]);
    }

    public function test_patient_can_cancel_their_booking(): void
    {
        $bookingId = \App\Models\Booking::insertGetId([
            'statusId' => 'S1',
            'doctorId' => $this->doctor->id,
            'patientId' => $this->patient->id,
            'date' => $this->bookingDate,
            'timeType' => 'T1',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $response = $this->actingAs($this->patient, 'sanctum')
            ->postJson("/api/patient/bookings/{$bookingId}/cancel");

        $response->assertOk()
            ->assertJsonFragment([
                'id' => $bookingId,
                'statusId' => 'S2',
            ]);

        $this->assertDatabaseHas('booking', [
            'id' => $bookingId,
            'statusId' => 'S2', // Cancelled status
        ]);
    }

    public function test_patient_cannot_book_the_same_slot_as_another_patient(): void
    {
        \App\Models\Schedule::insert([
            'doctorId' => $this->doctor->id,
            'date' => $this->bookingDate,
            'timeType' => 'T1',
            'currentNumber' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $otherPatient = User::factory()->create(['roleId' => 'R3']);
        $otherPatient->assignRole('R3');

        $this->actingAs($this->patient, 'sanctum')
            ->postJson('/api/patient/bookings', [
                'doctorId' => $this->doctor->id,
                'date' => $this->bookingDate,
                'timeType' => 'T1',
                'patientContactEmail' => 'first-patient@example.com',
            ])
            ->assertStatus(201);

        $this->actingAs($otherPatient, 'sanctum')
            ->postJson('/api/patient/bookings', [
                'doctorId' => $this->doctor->id,
                'date' => $this->bookingDate,
                'timeType' => 'T1',
                'patientContactEmail' => 'second-patient@example.com',
            ])
            ->assertStatus(422)
            ->assertJsonFragment([
                'message' => 'This time slot is already booked.',
            ]);

        $this->assertDatabaseHas('schedule', [
            'doctorId' => $this->doctor->id,
            'date' => $this->bookingDate,
            'timeType' => 'T1',
            'currentNumber' => 1,
        ]);
    }

    public function test_patient_cannot_book_more_than_thirty_days_ahead(): void
    {
        $outOfWindowDate = now('Europe/London')->addDays(31)->toDateString();

        \App\Models\Schedule::insert([
            'doctorId' => $this->doctor->id,
            'date' => $outOfWindowDate,
            'timeType' => 'T1',
            'currentNumber' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->actingAs($this->patient, 'sanctum')
            ->postJson('/api/patient/bookings', [
                'doctorId' => $this->doctor->id,
                'date' => $outOfWindowDate,
                'timeType' => 'T1',
                'patientContactEmail' => 'booking-mail@example.com',
            ])
            ->assertStatus(422)
            ->assertJsonFragment([
                'message' => 'Invalid booking window. Allowed range is Today to Today + 30 days.',
            ]);
    }

    public function test_patient_cannot_cancel_others_booking(): void
    {
        $otherPatient = User::factory()->create(['roleId' => 'R3']);
        
        $bookingId = \App\Models\Booking::insertGetId([
            'statusId' => 'S1',
            'doctorId' => $this->doctor->id,
            'patientId' => $otherPatient->id,
            'date' => $this->bookingDate,
            'timeType' => 'T1',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $response = $this->actingAs($this->patient, 'sanctum')
            ->postJson("/api/patient/bookings/{$bookingId}/cancel");

        $response->assertStatus(404);
        
        // Status should remain unchanged
        $this->assertDatabaseHas('booking', [
            'id' => $bookingId,
            'statusId' => 'S1', 
        ]);
    }
}
