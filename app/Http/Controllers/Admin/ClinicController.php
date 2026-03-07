<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\ClinicService;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
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
            'image' => 'nullable|string'
        ]);

        $clinic = $this->clinicService->create($validated);
        return response()->json($clinic, 201);
    }

    public function update(int $id, Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'string|max:255',
            'address' => 'string',
            'description' => 'string',
            'image' => 'nullable|string'
        ]);

        try {
            $clinic = $this->clinicService->update($id, $validated);
            return response()->json($clinic);
        } catch (RuntimeException) {
            return response()->json(['message' => 'Clinic not found'], 404);
        }
    }

    public function destroy(int $id): JsonResponse
    {
        try {
            $this->clinicService->delete($id);
            return response()->json(null, 204);
        } catch (RuntimeException) {
            return response()->json(['message' => 'Clinic not found'], 404);
        } catch (QueryException) {
            return response()->json(['message' => 'Clinic is in use and cannot be deleted'], 409);
        }
    }
}
