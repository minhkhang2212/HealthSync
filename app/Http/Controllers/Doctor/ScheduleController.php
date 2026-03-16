<?php

namespace App\Http\Controllers\Doctor;

use App\Helpers\TimeHelper;
use App\Http\Controllers\Controller;
use App\Services\ScheduleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use RuntimeException;

class ScheduleController extends Controller
{
    public function __construct(
        private readonly ScheduleService $scheduleService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'date' => 'nullable|date',
        ]);

        $doctorId = $request->user()->id;
        $date = $validated['date'] ?? TimeHelper::nowLondon()->toDateString();
        $schedules = $this->scheduleService->resolveDoctorScheduleForDate($doctorId, $date);
        
        return response()->json($schedules);
    }

    public function store(Request $request): JsonResponse
    {
        $timeTypeRules = TimeHelper::timeTypeKeys();
        $validated = $request->validate([
            'date' => 'required|date',
            'disabledTimeTypes' => 'nullable|array',
            'disabledTimeTypes.*' => ['string', Rule::in($timeTypeRules)],
        ]);

        $doctorId = $request->user()->id;
        $disabledTimeTypes = $validated['disabledTimeTypes'] ?? [];
        try {
            $createdSchedules = $this->scheduleService->syncDoctorDayAvailability(
                $doctorId,
                $validated['date'],
                $disabledTimeTypes
            );
        } catch (RuntimeException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }

        return response()->json(['message' => 'Schedules saved successfully', 'data' => $createdSchedules], 201);
    }
}
