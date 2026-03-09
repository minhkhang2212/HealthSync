<?php

namespace Tests\Feature;

use App\Models\Specialty;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AdminSpecialtyTest extends TestCase
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

    public function test_public_can_list_specialties(): void
    {
        Specialty::factory()->count(3)->create();

        $response = $this->getJson('/api/v1/specialties');

        $response->assertOk();
    }

    public function test_admin_can_create_specialty(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/admin/specialties', [
                'name' => 'Cardiology',
                'description' => 'Heart and blood vessel disorders',
            ]);

        $response->assertStatus(201)
            ->assertJsonFragment(['name' => 'Cardiology']);

        $this->assertDatabaseHas('specialty', ['name' => 'Cardiology']);
    }

    public function test_admin_can_create_specialty_with_uploaded_image(): void
    {
        Storage::fake('public');

        $response = $this->actingAs($this->admin, 'sanctum')
            ->post('/api/admin/specialties', [
                'name' => 'Neurology',
                'description' => 'Brain and nerve care',
                'imageFile' => UploadedFile::fake()->create('neurology.jpg', 200, 'image/jpeg'),
            ]);

        $response->assertStatus(201)
            ->assertJsonFragment(['name' => 'Neurology']);

        $storedImagePath = $response->json('image');
        $this->assertNotNull($storedImagePath);
        $this->assertStringStartsWith('/storage/specialties/', $storedImagePath);
        Storage::disk('public')->assertExists(str_replace('/storage/', '', $storedImagePath));
    }

    public function test_admin_create_specialty_validation(): void
    {
        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/admin/specialties', []);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name', 'description']);
    }

    public function test_admin_cannot_create_duplicate_specialty_name(): void
    {
        Specialty::factory()->create(['name' => 'Cardiology']);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/admin/specialties', [
                'name' => 'Cardiology',
                'description' => 'Duplicate should fail',
            ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name']);
    }

    public function test_admin_can_update_specialty(): void
    {
        $specialty = Specialty::factory()->create(['name' => 'Dermatology']);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->patchJson("/api/admin/specialties/{$specialty->id}", [
                'name' => 'Dermatology & Skincare',
            ]);

        $response->assertOk()
            ->assertJsonFragment(['name' => 'Dermatology & Skincare']);
    }

    public function test_admin_can_delete_specialty(): void
    {
        $specialty = Specialty::factory()->create();

        $response = $this->actingAs($this->admin, 'sanctum')
            ->deleteJson("/api/admin/specialties/{$specialty->id}");

        $response->assertStatus(204);
        $this->assertDatabaseMissing('specialty', ['id' => $specialty->id]);
    }

    public function test_patient_cannot_manage_specialties(): void
    {
        $response = $this->actingAs($this->patient, 'sanctum')
            ->postJson('/api/admin/specialties', [
                'name' => 'Unauthorized',
                'description' => 'Should fail',
            ]);

        $response->assertStatus(403);
    }
}
