<?php

namespace App\Http\Controllers\Admin;

use App\DTO\DoctorDTO;
use App\Http\Controllers\Controller;
use App\Services\DoctorService;
use App\Services\UserService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Spatie\Permission\Models\Role;

class DoctorController extends Controller
{
    public function __construct(
        private readonly DoctorService $doctorService,
        private readonly UserService $userService
    ) {}

    public function index(): JsonResponse
    {
        return response()->json($this->doctorService->list());
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|unique:users',
            'password' => 'required|string|min:8',
            'image' => 'nullable|string',
            'positionId' => 'nullable|string',
            'gender' => 'nullable|string',
            'phoneNumber' => 'nullable|string',
            // DoctorInfor fields
            'priceId' => 'nullable|string',
            'provinceId' => 'nullable|string',
            'paymentId' => 'nullable|string',
            'addressClinic' => 'nullable|string',
            'nameClinic' => 'nullable|string',
            'note' => 'nullable|string',
            'clinicId' => 'nullable|integer|exists:clinic,id',
            'specialtyId' => 'nullable|integer|exists:specialty,id',
        ]);

        // Create User first
        $user = $this->userService->create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => $validated['password'],
            'image' => $validated['image'] ?? null,
            'roleId' => 'R2', // Doctor Role
            'positionId' => $validated['positionId'] ?? null,
            'gender' => $validated['gender'] ?? null,
            'phoneNumber' => $validated['phoneNumber'] ?? null,
        ]);

        if (Role::query()->where('name', 'R2')->exists()) {
            $user->syncRoles(['R2']);
        }

        // Create DoctorInfor
        $dto = DoctorDTO::fromRequest($validated, $user->id);
        $this->doctorService->upsertDoctorInfor($dto);
        $this->doctorService->syncDoctorClinicSpecialty(
            $user->id,
            $validated['clinicId'] ?? null,
            $validated['specialtyId'] ?? null
        );

        return response()->json($this->doctorService->find($user->id), 201);
    }

    public function update(int $id, Request $request): JsonResponse
    {
        $user = $this->userService->find($id);
        if (!$user || $user->roleId !== 'R2') {
            return response()->json(['message' => 'Doctor not found'], 404);
        }

        $validated = $request->validate([
            'name' => 'string|max:255',
            'image' => 'nullable|string',
            'positionId' => 'nullable|string',
            'gender' => 'nullable|string',
            'phoneNumber' => 'nullable|string',
            // DoctorInfor fields
            'priceId' => 'nullable|string',
            'provinceId' => 'nullable|string',
            'paymentId' => 'nullable|string',
            'addressClinic' => 'nullable|string',
            'nameClinic' => 'nullable|string',
            'note' => 'nullable|string',
            'clinicId' => 'nullable|integer|exists:clinic,id',
            'specialtyId' => 'nullable|integer|exists:specialty,id',
        ]);

        $this->userService->update($id, array_filter([
            'name' => $validated['name'] ?? null,
            'image' => $validated['image'] ?? null,
            'positionId' => $validated['positionId'] ?? null,
            'gender' => $validated['gender'] ?? null,
            'phoneNumber' => $validated['phoneNumber'] ?? null,
        ]));

        $dto = DoctorDTO::fromRequest($request->all(), $id);
        $this->doctorService->upsertDoctorInfor($dto);
        $this->doctorService->syncDoctorClinicSpecialty(
            $id,
            $validated['clinicId'] ?? null,
            $validated['specialtyId'] ?? null
        );

        if (Role::query()->where('name', 'R2')->exists()) {
            $user->syncRoles(['R2']);
        }

        return response()->json($this->doctorService->find($id));
    }
}
