<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\SpecialtyService;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

class SpecialtyController extends Controller
{
    public function __construct(
        private readonly SpecialtyService $specialtyService
    ) {}

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:specialty,name',
            'description' => 'required|string',
            'image' => 'nullable|string',
            'imageFile' => 'nullable|image|max:5120',
        ]);

        $payload = $validated;
        unset($payload['imageFile']);

        if ($request->hasFile('imageFile')) {
            $payload['image'] = $this->storeSpecialtyImage($request);
        }

        $specialty = $this->specialtyService->create($payload);
        return response()->json($specialty, 201);
    }

    public function update(int $id, Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'string|max:255|unique:specialty,name,' . $id,
            'description' => 'string',
            'image' => 'nullable|string',
            'imageFile' => 'nullable|image|max:5120',
            'removeImage' => 'nullable|boolean',
        ]);

        try {
            $currentSpecialty = $this->specialtyService->find($id);
            if (!$currentSpecialty) {
                throw new RuntimeException('Specialty not found');
            }

            $payload = $validated;
            unset($payload['imageFile'], $payload['removeImage']);

            if (($validated['removeImage'] ?? false) && !$request->hasFile('imageFile')) {
                $this->deleteSpecialtyImage($currentSpecialty->image);
                $payload['image'] = null;
            }

            if ($request->hasFile('imageFile')) {
                $newImage = $this->storeSpecialtyImage($request);
                $this->deleteSpecialtyImage($currentSpecialty->image);
                $payload['image'] = $newImage;
            }

            $specialty = $this->specialtyService->update($id, $payload);
            return response()->json($specialty);
        } catch (RuntimeException) {
            return response()->json(['message' => 'Specialty not found'], 404);
        }
    }

    public function destroy(int $id): JsonResponse
    {
        try {
            $specialty = $this->specialtyService->find($id);
            if (!$specialty) {
                throw new RuntimeException('Specialty not found');
            }

            $this->specialtyService->delete($id);
            $this->deleteSpecialtyImage($specialty->image);
            return response()->json(null, 204);
        } catch (RuntimeException) {
            return response()->json(['message' => 'Specialty not found'], 404);
        } catch (QueryException) {
            return response()->json(['message' => 'Specialty is in use and cannot be deleted'], 409);
        }
    }

    private function storeSpecialtyImage(Request $request): string
    {
        $path = $request->file('imageFile')->store('specialties', 'public');
        return "/storage/{$path}";
    }

    private function deleteSpecialtyImage(?string $imagePath): void
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
