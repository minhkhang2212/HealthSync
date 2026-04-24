<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\GoogleIdTokenVerifier;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RoleSeeder::class);
    }

    public function test_user_can_register(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name' => 'Test Patient',
            'email' => 'patient@test.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'phoneNumber' => '+441234567890',
            'gender' => 'F',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure(['access_token', 'token_type', 'user']);

        $this->assertDatabaseHas('users', [
            'email' => 'patient@test.com',
            'roleId' => 'R3',
            'phoneNumber' => '+441234567890',
            'gender' => 'F',
        ]);
    }

    public function test_register_validation_fails_without_email(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name' => 'Test',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_user_can_login(): void
    {
        $user = User::factory()->create([
            'email' => 'login@test.com',
            'password' => bcrypt('password123'),
            'roleId' => 'R3',
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email' => 'login@test.com',
            'password' => 'password123',
        ]);

        $response->assertOk()
            ->assertJsonStructure(['access_token', 'token_type', 'user']);
    }

    public function test_google_auth_creates_new_patient(): void
    {
        config(['services.google.client_id' => 'google-client-id']);
        $this->mockGooglePayload([
            'sub' => 'google-sub-1',
            'email' => 'google-patient@test.com',
            'email_verified' => true,
            'name' => 'Google Patient',
            'picture' => 'https://example.com/avatar.png',
        ]);

        $response = $this->postJson('/api/auth/google', [
            'credential' => 'valid-google-token',
        ]);

        $response->assertOk()
            ->assertJsonStructure(['access_token', 'token_type', 'user'])
            ->assertJsonPath('user.roleId', 'R3')
            ->assertJsonPath('user.email', 'google-patient@test.com');

        $this->assertDatabaseHas('users', [
            'email' => 'google-patient@test.com',
            'google_id' => 'google-sub-1',
            'roleId' => 'R3',
            'phoneNumber' => null,
            'gender' => null,
        ]);
    }

    public function test_google_auth_links_existing_patient_by_email(): void
    {
        config(['services.google.client_id' => 'google-client-id']);
        $patient = User::factory()->create([
            'email' => 'existing-patient@test.com',
            'email_verified_at' => null,
            'roleId' => 'R3',
            'phoneNumber' => '+440000000000',
            'gender' => 'M',
            'image' => null,
        ]);
        $this->mockGooglePayload([
            'sub' => 'google-sub-2',
            'email' => 'existing-patient@test.com',
            'email_verified' => true,
            'name' => 'Existing Patient',
            'picture' => 'https://example.com/existing.png',
        ]);

        $response = $this->postJson('/api/auth/google', [
            'credential' => 'valid-google-token',
        ]);

        $response->assertOk()
            ->assertJsonPath('user.id', $patient->id);

        $this->assertDatabaseHas('users', [
            'id' => $patient->id,
            'google_id' => 'google-sub-2',
            'phoneNumber' => '+440000000000',
            'gender' => 'M',
            'image' => 'https://example.com/existing.png',
        ]);
        $this->assertNotNull($patient->fresh()->email_verified_at);
    }

    public function test_google_auth_rejects_existing_non_patient_email(): void
    {
        config(['services.google.client_id' => 'google-client-id']);
        User::factory()->create([
            'email' => 'admin@test.com',
            'roleId' => 'R1',
        ]);
        $this->mockGooglePayload([
            'sub' => 'google-sub-3',
            'email' => 'admin@test.com',
            'email_verified' => true,
        ]);

        $response = $this->postJson('/api/auth/google', [
            'credential' => 'valid-google-token',
        ]);

        $response->assertStatus(403)
            ->assertJsonPath('message', 'Google sign in is only available for patient accounts.');

        $this->assertDatabaseMissing('users', [
            'email' => 'admin@test.com',
            'google_id' => 'google-sub-3',
        ]);
    }

    public function test_google_auth_rejects_invalid_or_wrong_audience_token(): void
    {
        config(['services.google.client_id' => 'google-client-id']);
        $this->mockGooglePayload(false);

        $response = $this->postJson('/api/auth/google', [
            'credential' => 'invalid-google-token',
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('message', 'Invalid Google credential.');
    }

    public function test_google_auth_rejects_unverified_email(): void
    {
        config(['services.google.client_id' => 'google-client-id']);
        $this->mockGooglePayload([
            'sub' => 'google-sub-4',
            'email' => 'unverified@test.com',
            'email_verified' => false,
        ]);

        $response = $this->postJson('/api/auth/google', [
            'credential' => 'valid-google-token',
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('message', 'Invalid Google credential.');
    }

    public function test_login_fails_with_wrong_password(): void
    {
        User::factory()->create([
            'email' => 'wrong@test.com',
            'password' => bcrypt('correctpassword'),
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email' => 'wrong@test.com',
            'password' => 'wrongpassword',
        ]);

        $response->assertStatus(422);
    }

    public function test_authenticated_user_can_get_profile(): void
    {
        $user = User::factory()->create(['roleId' => 'R3']);

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/auth/me');

        $response->assertOk()
            ->assertJsonFragment(['email' => $user->email]);
    }

    public function test_authenticated_user_can_logout(): void
    {
        $user = User::factory()->create(['roleId' => 'R3']);
        Sanctum::actingAs($user, ['*']);

        $response = $this->postJson('/api/auth/logout');

        $response->assertOk()
            ->assertJson(['message' => 'Logged out successfully']);
    }

    public function test_unauthenticated_user_cannot_access_me(): void
    {
        $response = $this->getJson('/api/auth/me');

        $response->assertStatus(401);
    }

    /**
     * @param array<string, mixed>|false $payload
     */
    private function mockGooglePayload(array|false $payload): void
    {
        $this->app->instance(GoogleIdTokenVerifier::class, new class($payload) extends GoogleIdTokenVerifier {
            /**
             * @param array<string, mixed>|false $payload
             */
            public function __construct(private readonly array|false $payload)
            {
            }

            /**
             * @return array<string, mixed>|false
             */
            public function verify(string $credential, string $clientId): array|false
            {
                return $this->payload;
            }
        });
    }
}
