<?php

namespace App\Http\Controllers\Doctor;

use App\DTO\ScheduleDTO;
use App\Http\Controllers\Controller;
use App\Services\ScheduleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ScheduleController extends Controller
{
    public function __construct(
        private readonly ScheduleService $scheduleService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $doctorId = $request->user()->id;
        $schedules = $this->scheduleService->getDoctorSchedules($doctorId);
        
        return response()->json($schedules);
    }

    public function store(Request $request): JsonResponse
    {
        // Accept either single schedule or array of schedules
        $validated = $request->validate([
            'schedules' => 'required|array',
            'schedules.*.date' => 'required|date',
            'schedules.*.timeType' => 'required|string',
            'schedules.*.maxNumber' => 'integer|min:1',
        ]);

        $doctorId = $request->user()->id;
        $createdSchedules = [];

        foreach ($validated['schedules'] as $scheduleData) {
            $dto = new ScheduleDTO(
                $doctorId,
                $scheduleData['date'],
                $scheduleData['timeType'],
                $scheduleData['maxNumber'] ?? 5
            );
            $createdSchedules[] = $this->scheduleService->createSchedule($dto);
        }

        return response()->json(['message' => 'Schedules saved successfully', 'data' => $createdSchedules], 201);
    }

    public function destroy(int $id, Request $request): JsonResponse
    {
        $schedule = $this->scheduleService->find($id);
        
        if (!$schedule || $schedule->doctorId !== $request->user()->id) {
            return response()->json(['message' => 'Not found or unauthorized'], 404);
        }

        if ($schedule->currentNumber > 0) {
            return response()->json(['message' => 'Cannot delete a schedule that has active bookings.'], 422);
        }

        $this->scheduleService->delete($id);

        return response()->json(null, 204);
    }
}
