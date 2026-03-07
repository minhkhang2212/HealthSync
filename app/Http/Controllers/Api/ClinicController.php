<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ClinicService;
use Illuminate\Http\JsonResponse;

class ClinicController extends Controller
{
    public function __construct(
        private readonly ClinicService $clinicService
    ) {}

    public function index(): JsonResponse
    {
        return response()->json($this->clinicService->list());
    }

    public function show(int $id): JsonResponse
    {
        $clinic = $this->clinicService->find($id);

        if (!$clinic) {
            return response()->json(['message' => 'Clinic not found'], 404);
        }

        return response()->json($clinic);
    }
}
