<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\SpecialtyService;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

class SpecialtyController extends Controller
{
    public function __construct(
        private readonly SpecialtyService $specialtyService
    ) {}

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'required|string',
            'image' => 'nullable|string'
        ]);

        $specialty = $this->specialtyService->create($validated);
        return response()->json($specialty, 201);
    }

    public function update(int $id, Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'string|max:255',
            'description' => 'string',
            'image' => 'nullable|string'
        ]);

        try {
            $specialty = $this->specialtyService->update($id, $validated);
            return response()->json($specialty);
        } catch (RuntimeException) {
            return response()->json(['message' => 'Specialty not found'], 404);
        }
    }

    public function destroy(int $id): JsonResponse
    {
        try {
            $this->specialtyService->delete($id);
            return response()->json(null, 204);
        } catch (RuntimeException) {
            return response()->json(['message' => 'Specialty not found'], 404);
        } catch (QueryException) {
            return response()->json(['message' => 'Specialty is in use and cannot be deleted'], 409);
        }
    }
}
