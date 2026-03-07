<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\SpecialtyService;
use Illuminate\Http\JsonResponse;

class SpecialtyController extends Controller
{
    public function __construct(
        private readonly SpecialtyService $specialtyService
    ) {}

    public function index(): JsonResponse
    {
        return response()->json($this->specialtyService->list());
    }

    public function show(int $id): JsonResponse
    {
        $specialty = $this->specialtyService->find($id);

        if (!$specialty) {
            return response()->json(['message' => 'Specialty not found'], 404);
        }

        return response()->json($specialty);
    }
}
