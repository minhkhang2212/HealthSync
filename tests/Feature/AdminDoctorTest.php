<?php

namespace Tests\Feature;

use App\Models\Clinic;
use App\Models\Specialty;
use App\Models\User;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AdminDoctorTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);

        $this->admin = User::factory()->create(['roleId' => 'R1']);
        $this->admin->assignRole('R1');
    }

    public function test_admin_can_create_doctor_with_uploaded_image(): void
    {
        Storage::fake('public');

        $clinic = Clinic::factory()->create();
        $specialty = Specialty::factory()->create();

        $response = $this->actingAs($this->admin, 'sanctum')
            ->post('/api/admin/doctors', [
                'name' => 'Dr Michael Scott',
                'email' => 'michael.scott@healthsync.com',
                'password' => 'password123',
                'clinicId' => $clinic->id,
                'specialtyId' => $specialty->id,
                'imageFile' => UploadedFile::fake()->create('doctor.jpg', 200, 'image/jpeg'),
            ]);

        $response->assertStatus(201)
            ->assertJsonFragment([
                'email' => 'michael.scott@healthsync.com',
                'roleId' => 'R2',
                'isActive' => true,
            ]);

        $this->assertDatabaseHas('users', [
            'email' => 'michael.scott@healthsync.com',
            'roleId' => 'R2',
            'isActive' => 1,
        ]);

        $storedImagePath = $response->json('image');
        $this->assertNotNull($storedImagePath);
        $this->assertStringStartsWith('/storage/doctors/', $storedImagePath);
        Storage::disk('public')->assertExists(str_replace('/storage/', '', $storedImagePath));

        $doctorId = $response->json('id');
        $this->assertNotNull($doctorId);
        $this->assertDatabaseHas('doctor_clinic_specialty', [
            'doctorId' => $doctorId,
            'clinicId' => $clinic->id,
            'specialtyId' => $specialty->id,
        ]);
    }

    public function test_admin_can_set_doctor_inactive(): void
    {
        $doctor = User::factory()->create([
            'roleId' => 'R2',
            'isActive' => true,
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->patchJson("/api/admin/doctors/{$doctor->id}", [
                'isActive' => false,
            ]);

        $response->assertStatus(200)
            ->assertJsonFragment([
                'id' => $doctor->id,
                'isActive' => false,
            ]);

        $this->assertDatabaseHas('users', [
            'id' => $doctor->id,
            'isActive' => 0,
        ]);
    }

    public function test_patient_catalog_excludes_inactive_doctors(): void
    {
        $activeDoctor = User::factory()->create([
            'roleId' => 'R2',
            'isActive' => true,
        ]);

        $inactiveDoctor = User::factory()->create([
            'roleId' => 'R2',
            'isActive' => false,
        ]);

        $response = $this->getJson('/api/v1/doctors');

        $response->assertStatus(200)
            ->assertJsonCount(1)
            ->assertJsonFragment(['id' => $activeDoctor->id])
            ->assertJsonMissing(['id' => $inactiveDoctor->id]);
    }
}
