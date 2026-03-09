<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\ClinicService;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

class ClinicController extends Controller
{
    public function __construct(
        private readonly ClinicService $clinicService
    ) {}

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'address' => 'required|string',
            'description' => 'required|string',
            'image' => 'nullable|string',
            'imageFile' => 'nullable|image|max:5120',
        ]);

        $payload = $validated;
        unset($payload['imageFile']);

        if ($request->hasFile('imageFile')) {
            $payload['image'] = $this->storeClinicImage($request);
        }

        $clinic = $this->clinicService->create($payload);
        return response()->json($clinic, 201);
    }

    public function update(int $id, Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'string|max:255',
            'address' => 'string',
            'description' => 'string',
            'image' => 'nullable|string',
            'imageFile' => 'nullable|image|max:5120',
            'removeImage' => 'nullable|boolean',
        ]);

        try {
            $currentClinic = $this->clinicService->find($id);
            if (!$currentClinic) {
                throw new RuntimeException('Clinic not found');
            }

            $payload = $validated;
            unset($payload['imageFile'], $payload['removeImage']);

            if (($validated['removeImage'] ?? false) && !$request->hasFile('imageFile')) {
                $this->deleteClinicImage($currentClinic->image);
                $payload['image'] = null;
            }

            if ($request->hasFile('imageFile')) {
                $newImage = $this->storeClinicImage($request);
                $this->deleteClinicImage($currentClinic->image);
                $payload['image'] = $newImage;
            }

            $clinic = $this->clinicService->update($id, $payload);
            return response()->json($clinic);
        } catch (RuntimeException) {
            return response()->json(['message' => 'Clinic not found'], 404);
        }
    }

    public function destroy(int $id): JsonResponse
    {
        try {
            $clinic = $this->clinicService->find($id);
            if (!$clinic) {
                throw new RuntimeException('Clinic not found');
            }

            $this->clinicService->delete($id);
            $this->deleteClinicImage($clinic->image);
            return response()->json(null, 204);
        } catch (RuntimeException) {
            return response()->json(['message' => 'Clinic not found'], 404);
        } catch (QueryException) {
            return response()->json(['message' => 'Clinic is in use and cannot be deleted'], 409);
        }
    }

    private function storeClinicImage(Request $request): string
    {
        $path = $request->file('imageFile')->store('clinics', 'public');
        return "/storage/{$path}";
    }

    private function deleteClinicImage(?string $imagePath): void
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
