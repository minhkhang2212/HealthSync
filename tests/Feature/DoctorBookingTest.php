<?php

namespace Tests\Feature;

use App\Mail\DoctorBookingConfirmationMail;
use App\Mail\DoctorPrescriptionMail;
use App\Models\Booking;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class DoctorBookingTest extends TestCase
{
    use RefreshDatabase;

    private User $doctor;
    private User $patient;
    private string $bookingDate;
    private string $contactEmail;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);

        $this->doctor = User::factory()->create(['roleId' => 'R2']);
        $this->doctor->assignRole('R2');

        $this->patient = User::factory()->create(['roleId' => 'R3']);
        $this->patient->assignRole('R3');

        $this->bookingDate = now('Europe/London')->addDay()->toDateString();
        $this->contactEmail = 'appointment-contact@example.com';
    }

    public function test_doctor_can_filter_bookings_by_date_and_see_patient_details(): void
    {
        Booking::create([
            'doctorId' => $this->doctor->id,
            'patientId' => $this->patient->id,
            'patientContactEmail' => $this->contactEmail,
            'date' => $this->bookingDate,
            'timeType' => 'T1',
            'statusId' => 'S1',
        ]);

        Booking::create([
            'doctorId' => $this->doctor->id,
            'patientId' => $this->patient->id,
            'patientContactEmail' => 'followup@example.com',
            'date' => now('Europe/London')->addDays(2)->toDateString(),
            'timeType' => 'T2',
            'statusId' => 'S1',
        ]);

        $this->actingAs($this->doctor, 'sanctum')
            ->getJson("/api/doctor/bookings?date={$this->bookingDate}")
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.patient.name', $this->patient->name)
            ->assertJsonPath('0.patientContactEmail', $this->contactEmail);
    }

    public function test_doctor_can_confirm_booking_with_attachment(): void
    {
        Storage::fake('public');
        Mail::fake();

        $booking = Booking::create([
            'doctorId' => $this->doctor->id,
            'patientId' => $this->patient->id,
            'patientContactEmail' => $this->contactEmail,
            'date' => $this->bookingDate,
            'timeType' => 'T1',
            'statusId' => 'S1',
        ]);

        $response = $this->actingAs($this->doctor, 'sanctum')
            ->post("/api/doctor/bookings/{$booking->id}/confirm", [
                'confirmationFile' => UploadedFile::fake()->create('confirmation.pdf', 200, 'application/pdf'),
            ]);

        $response->assertOk()
            ->assertJsonPath('statusId', 'S1')
            ->assertJsonPath('patientContactEmail', $this->contactEmail);

        $booking->refresh();
        $this->assertNotNull($booking->confirmedAt);
        $this->assertNotNull($booking->confirmationAttachment);
        $this->assertStringStartsWith('/storage/booking-confirmations/', $booking->confirmationAttachment);
        Storage::disk('public')->assertExists(str_replace('/storage/', '', $booking->confirmationAttachment));
        Mail::assertSent(DoctorBookingConfirmationMail::class, fn (DoctorBookingConfirmationMail $mail) => $mail->hasTo($this->contactEmail));
    }

    public function test_doctor_can_send_prescription_after_confirmation_and_booking_becomes_done(): void
    {
        Storage::fake('public');
        Mail::fake();

        $booking = Booking::create([
            'doctorId' => $this->doctor->id,
            'patientId' => $this->patient->id,
            'patientContactEmail' => $this->contactEmail,
            'date' => $this->bookingDate,
            'timeType' => 'T1',
            'statusId' => 'S1',
            'confirmedAt' => now('Europe/London'),
        ]);

        $this->actingAs($this->doctor, 'sanctum')
            ->post("/api/doctor/bookings/{$booking->id}/send-prescription", [
                'prescriptionFile' => UploadedFile::fake()->create('prescription.pdf', 200, 'application/pdf'),
            ])
            ->assertOk()
            ->assertJsonPath('statusId', 'S3');

        $booking->refresh();
        $this->assertDatabaseHas('booking', [
            'id' => $booking->id,
            'statusId' => 'S3',
        ]);
        $this->assertNotNull($booking->prescriptionSentAt);
        $this->assertStringStartsWith('/storage/booking-prescriptions/', $booking->prescriptionAttachment);
        Storage::disk('public')->assertExists(str_replace('/storage/', '', $booking->prescriptionAttachment));
        Mail::assertSent(DoctorPrescriptionMail::class, fn (DoctorPrescriptionMail $mail) => $mail->hasTo($this->contactEmail));
    }
}
