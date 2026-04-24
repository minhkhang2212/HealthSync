<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\GoogleIdTokenVerifier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Spatie\Permission\Models\Role;

class AuthController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8|confirmed',
            'phoneNumber' => 'nullable|string|max:30',
            'gender' => 'nullable|string|in:M,F,O',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'phoneNumber' => $validated['phoneNumber'] ?? null,
            'gender' => $validated['gender'] ?? null,
            'roleId' => 'R3', // Default to Patient
        ]);

        if (Role::query()->where('name', 'R3')->exists()) {
            $user->syncRoles(['R3']);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => $user
        ], 201);
    }

    public function google(Request $request, GoogleIdTokenVerifier $verifier): JsonResponse
    {
        $validated = $request->validate([
            'credential' => 'required|string',
        ]);

        $clientId = config('services.google.client_id');

        if (!$clientId) {
            return response()->json([
                'message' => 'Google authentication is not configured.',
            ], 503);
        }

        $payload = $verifier->verify($validated['credential'], $clientId);

        if (!$this->isValidGooglePayload($payload)) {
            return response()->json([
                'message' => 'Invalid Google credential.',
            ], 422);
        }

        $googleId = (string) $payload['sub'];
        $email = (string) $payload['email'];
        $avatar = $payload['picture'] ?? null;

        $user = User::where('google_id', $googleId)->first();

        if (!$user) {
            $user = User::where('email', $email)->first();

            if ($user && $user->roleId !== 'R3') {
                return response()->json([
                    'message' => 'Google sign in is only available for patient accounts.',
                ], 403);
            }

            if ($user) {
                $user->forceFill([
                    'google_id' => $googleId,
                    'email_verified_at' => $user->email_verified_at ?? now(),
                    'image' => $user->image ?: $avatar,
                ])->save();
            } else {
                $user = User::create([
                    'name' => $payload['name'] ?? $email,
                    'email' => $email,
                    'email_verified_at' => now(),
                    'google_id' => $googleId,
                    'password' => Hash::make(Str::random(40)),
                    'roleId' => 'R3',
                    'image' => $avatar,
                    'phoneNumber' => null,
                    'gender' => null,
                ]);
            }
        }

        if ($user->roleId !== 'R3') {
            return response()->json([
                'message' => 'Google sign in is only available for patient accounts.',
            ], 403);
        }

        if (Role::query()->where('name', 'R3')->exists()) {
            $user->syncRoles(['R3']);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => $user->fresh(),
        ]);
    }

    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => 'required|string|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $validated['email'])->first();

        if (!$user || !Hash::check($validated['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => $user
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json($request->user());
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logged out successfully'
        ]);
    }

    /**
     * @param array<string, mixed>|false $payload
     */
    private function isValidGooglePayload(array|false $payload): bool
    {
        return is_array($payload)
            && !empty($payload['sub'])
            && !empty($payload['email'])
            && filter_var($payload['email'], FILTER_VALIDATE_EMAIL)
            && filter_var($payload['email_verified'] ?? false, FILTER_VALIDATE_BOOL);
    }
}
