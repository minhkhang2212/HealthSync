<?php

namespace App\Http\Controllers\Admin;

use App\DTO\DoctorDTO;
use App\Http\Controllers\Controller;
use App\Services\DoctorService;
use App\Services\UserService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
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
            'imageFile' => 'nullable|image|max:5120',
            'positionId' => 'nullable|string',
            'gender' => 'nullable|string',
            'phoneNumber' => 'nullable|string',
            'isActive' => 'nullable|boolean',
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

        $image = $validated['image'] ?? null;
        if ($request->hasFile('imageFile')) {
            $image = $this->storeDoctorImage($request);
        }

        // Create User first
        $user = $this->userService->create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => $validated['password'],
            'image' => $image,
            'roleId' => 'R2', // Doctor Role
            'positionId' => $validated['positionId'] ?? null,
            'gender' => $validated['gender'] ?? null,
            'phoneNumber' => $validated['phoneNumber'] ?? null,
            'isActive' => $validated['isActive'] ?? true,
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
            'imageFile' => 'nullable|image|max:5120',
            'removeImage' => 'nullable|boolean',
            'positionId' => 'nullable|string',
            'gender' => 'nullable|string',
            'phoneNumber' => 'nullable|string',
            'isActive' => 'nullable|boolean',
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

        $userPayload = [];
        if (array_key_exists('name', $validated)) {
            $userPayload['name'] = $validated['name'];
        }
        if (array_key_exists('positionId', $validated)) {
            $userPayload['positionId'] = $validated['positionId'];
        }
        if (array_key_exists('gender', $validated)) {
            $userPayload['gender'] = $validated['gender'];
        }
        if (array_key_exists('phoneNumber', $validated)) {
            $userPayload['phoneNumber'] = $validated['phoneNumber'];
        }
        if (array_key_exists('isActive', $validated)) {
            $userPayload['isActive'] = (bool) $validated['isActive'];
        }

        $removeImage = ($validated['removeImage'] ?? false) && !$request->hasFile('imageFile');
        if ($removeImage) {
            $this->deleteDoctorImage($user->image);
            $userPayload['image'] = null;
        } elseif ($request->hasFile('imageFile')) {
            $newImage = $this->storeDoctorImage($request);
            $this->deleteDoctorImage($user->image);
            $userPayload['image'] = $newImage;
        } elseif (array_key_exists('image', $validated)) {
            $userPayload['image'] = $validated['image'];
        }

        if (!empty($userPayload)) {
            $this->userService->update($id, $userPayload);
        }

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

    private function storeDoctorImage(Request $request): string
    {
        $path = $request->file('imageFile')->store('doctors', 'public');
        return "/storage/{$path}";
    }

    private function deleteDoctorImage(?string $imagePath): void
    {
        if (!$imagePath) {
            return;
        }

        if (str_starts_with($imagePath, '/storage/')) {
            $relativePath = substr($imagePath, strlen('/storage/'));
            if ($relativePath !== '') {
                Storage::disk('public')->delete($relativePath);
            }
        }
    }
}
