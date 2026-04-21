<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class AdminBookingTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $doctor;
    private User $patient;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);

        Carbon::setTestNow(Carbon::parse('2026-04-21 10:00:00', 'Europe/London'));

        $this->admin = User::factory()->create(['roleId' => 'R1']);
        $this->admin->assignRole('R1');

        $this->doctor = User::factory()->create(['roleId' => 'R2']);
        $this->doctor->assignRole('R2');

        $this->patient = User::factory()->create(['roleId' => 'R3']);
        $this->patient->assignRole('R3');
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    public function test_admin_bookings_response_includes_current_month_recognized_revenue_summary(): void
    {
        Booking::create([
            'doctorId' => $this->doctor->id,
            'patientId' => $this->patient->id,
            'patientContactEmail' => 'counted-online@example.com',
            'date' => '2026-04-23',
            'timeType' => 'T3',
            'statusId' => 'S1',
            'paymentMethod' => 'stripe',
            'paymentStatus' => 'paid',
            'paymentAmount' => 3500,
            'paymentCurrency' => 'gbp',
            'paidAt' => Carbon::parse('2026-04-03 09:00:00', 'Europe/London'),
        ]);

        Booking::create([
            'doctorId' => $this->doctor->id,
            'patientId' => $this->patient->id,
            'patientContactEmail' => 'counted-clinic@example.com',
            'date' => '2026-04-20',
            'timeType' => 'T2',
            'statusId' => 'S3',
            'paymentMethod' => 'pay_at_clinic',
            'paymentStatus' => 'paid',
            'paymentAmount' => 4500,
            'paymentCurrency' => 'gbp',
            'paidAt' => Carbon::parse('2026-04-20 18:00:00', 'Europe/London'),
        ]);

        Booking::create([
            'doctorId' => $this->doctor->id,
            'patientId' => $this->patient->id,
            'patientContactEmail' => 'pending@example.com',
            'date' => '2026-04-18',
            'timeType' => 'T1',
            'statusId' => 'S1',
            'paymentMethod' => 'stripe',
            'paymentStatus' => 'pending',
            'paymentAmount' => 9900,
            'paymentCurrency' => 'gbp',
        ]);

        Booking::create([
            'doctorId' => $this->doctor->id,
            'patientId' => $this->patient->id,
            'patientContactEmail' => 'cancelled@example.com',
            'date' => '2026-04-16',
            'timeType' => 'T4',
            'statusId' => 'S2',
            'paymentMethod' => 'stripe',
            'paymentStatus' => 'cancelled',
            'paymentAmount' => 5200,
            'paymentCurrency' => 'gbp',
        ]);

        Booking::create([
            'doctorId' => $this->doctor->id,
            'patientId' => $this->patient->id,
            'patientContactEmail' => 'paid-last-month@example.com',
            'date' => '2026-03-30',
            'timeType' => 'T5',
            'statusId' => 'S3',
            'paymentMethod' => 'stripe',
            'paymentStatus' => 'paid',
            'paymentAmount' => 6500,
            'paymentCurrency' => 'gbp',
            'paidAt' => Carbon::parse('2026-03-30 11:00:00', 'Europe/London'),
        ]);

        Booking::create([
            'doctorId' => $this->doctor->id,
            'patientId' => $this->patient->id,
            'patientContactEmail' => 'no-amount@example.com',
            'date' => '2026-04-15',
            'timeType' => 'T6',
            'statusId' => 'S3',
            'paymentMethod' => 'pay_at_clinic',
            'paymentStatus' => 'paid',
            'paymentAmount' => null,
            'paymentCurrency' => 'gbp',
            'paidAt' => Carbon::parse('2026-04-15 14:00:00', 'Europe/London'),
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/admin/bookings');

        $response->assertOk()
            ->assertJsonPath('total', 6)
            ->assertJsonPath('recognizedRevenueAmount', 8000)
            ->assertJsonPath('recognizedRevenueCurrency', 'gbp')
            ->assertJsonCount(6, 'items');
    }

    public function test_admin_can_view_monthly_revenue_history(): void
    {
        Booking::create([
            'doctorId' => $this->doctor->id,
            'patientId' => $this->patient->id,
            'patientContactEmail' => 'april@example.com',
            'date' => '2026-04-23',
            'timeType' => 'T3',
            'statusId' => 'S1',
            'paymentMethod' => 'stripe',
            'paymentStatus' => 'paid',
            'paymentAmount' => 3500,
            'paymentCurrency' => 'gbp',
            'paidAt' => Carbon::parse('2026-04-03 09:00:00', 'Europe/London'),
        ]);

        Booking::create([
            'doctorId' => $this->doctor->id,
            'patientId' => $this->patient->id,
            'patientContactEmail' => 'march@example.com',
            'date' => '2026-03-25',
            'timeType' => 'T5',
            'statusId' => 'S3',
            'paymentMethod' => 'pay_at_clinic',
            'paymentStatus' => 'paid',
            'paymentAmount' => 6500,
            'paymentCurrency' => 'gbp',
            'paidAt' => Carbon::parse('2026-03-30 11:00:00', 'Europe/London'),
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/admin/revenue/monthly');

        $response->assertOk()
            ->assertJsonPath('currentMonth', '2026-04')
            ->assertJsonPath('recognizedRevenueCurrency', 'gbp')
            ->assertJsonPath('items.0.month', '2026-04')
            ->assertJsonPath('items.0.recognizedRevenueAmount', 3500)
            ->assertJsonPath('items.0.paidBookingsCount', 1)
            ->assertJsonPath('items.1.month', '2026-03')
            ->assertJsonPath('items.1.recognizedRevenueAmount', 6500)
            ->assertJsonPath('items.1.paidBookingsCount', 1);
    }

    public function test_admin_can_download_monthly_revenue_pdf_report(): void
    {
        Booking::create([
            'doctorId' => $this->doctor->id,
            'patientId' => $this->patient->id,
            'patientContactEmail' => 'april@example.com',
            'date' => '2026-04-23',
            'timeType' => 'T3',
            'statusId' => 'S1',
            'paymentMethod' => 'stripe',
            'paymentStatus' => 'paid',
            'paymentAmount' => 3500,
            'paymentCurrency' => 'gbp',
            'paidAt' => Carbon::parse('2026-04-03 09:00:00', 'Europe/London'),
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->get('/api/admin/revenue/monthly/2026-04/pdf');

        $response->assertOk()
            ->assertHeader('content-type', 'application/pdf')
            ->assertHeader('content-disposition', 'attachment; filename="healthsync-revenue-2026-04.pdf"');

        $this->assertStringStartsWith('%PDF-1.4', $response->getContent());
    }
}
