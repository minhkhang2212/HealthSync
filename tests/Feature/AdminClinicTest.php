<?php

namespace Tests\Feature;

use App\Models\Clinic;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminClinicTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $patient;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);

        $this->admin = User::factory()->create(['roleId' => 'R1']);
        $this->admin->assignRole('R1');

        $this->patient = User::factory()->create(['roleId' => 'R3']);
        $this->patient->assignRole('R3');
    }

    public function test_public_can_list_clinics(): void
    {
        Clinic::factory()->count(3)->create();

        $response = $this->getJson('/api/v1/clinics');

        $response->assertOk();
    }

    public function test_admin_can_create_clinic(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/admin/clinics', [
                'name' => 'Royal London Hospital',
                'address' => 'Whitechapel Rd, London',
                'description' => 'Major teaching hospital in East London',
            ]);

        $response->assertStatus(201)
            ->assertJsonFragment(['name' => 'Royal London Hospital']);

        $this->assertDatabaseHas('clinic', ['name' => 'Royal London Hospital']);
    }

    public function test_admin_create_clinic_validation(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/admin/clinics', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name', 'address', 'description']);
    }

    public function test_admin_can_update_clinic(): void
    {
        $clinic = Clinic::factory()->create(['name' => 'Old Name']);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->patchJson("/api/admin/clinics/{$clinic->id}", [
                'name' => 'New Name',
            ]);

        $response->assertOk()
            ->assertJsonFragment(['name' => 'New Name']);
    }

    public function test_admin_can_delete_clinic(): void
    {
        $clinic = Clinic::factory()->create();

        $response = $this->actingAs($this->admin, 'sanctum')
            ->deleteJson("/api/admin/clinics/{$clinic->id}");

        $response->assertStatus(204);
        $this->assertDatabaseMissing('clinic', ['id' => $clinic->id]);
    }

    public function test_patient_cannot_create_clinic(): void
    {
        $response = $this->actingAs($this->patient, 'sanctum')
            ->postJson('/api/admin/clinics', [
                'name' => 'Unauthorized Clinic',
                'address' => 'Nowhere',
                'description' => 'Should fail',
            ]);

        $response->assertStatus(403);
    }

    public function test_unauthenticated_cannot_create_clinic(): void
    {
        $response = $this->postJson('/api/admin/clinics', [
            'name' => 'No Auth Clinic',
            'address' => 'Nowhere',
            'description' => 'Should fail',
        ]);

        $response->assertStatus(401);
    }
}
