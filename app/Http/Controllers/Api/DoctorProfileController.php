<?php

namespace App\Http\Controllers\Api;

use App\Helpers\TimeHelper;
use App\Http\Controllers\Controller;
use App\Models\Schedule;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DoctorProfileController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'specialtyId' => 'nullable|integer',
            'clinicId' => 'nullable|integer',
            'search' => 'nullable|string|max:255',
            'paginate' => 'nullable|boolean',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        $query = User::query()
            ->where('roleId', 'R2')
            ->where('isActive', true)
            ->with(['doctorInfor.markdowns', 'doctorClinicSpecialties.clinic', 'doctorClinicSpecialties.specialty']);

        if (!empty($validated['search'])) {
            $search = $validated['search'];
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if (!empty($validated['clinicId'])) {
            $query->whereHas('doctorClinicSpecialties', function ($q) use ($validated) {
                $q->where('clinicId', $validated['clinicId']);
            });
        }

        if (!empty($validated['specialtyId'])) {
            $query->whereHas('doctorClinicSpecialties', function ($q) use ($validated) {
                $q->where('specialtyId', $validated['specialtyId']);
            });
        }

        if (($validated['paginate'] ?? false) === true) {
            $perPage = $validated['per_page'] ?? 15;
            return response()->json($query->paginate($perPage));
        }

        return response()->json($query->get());
    }

    public function showByDoctor(int $id): JsonResponse
    {
        $doctor = User::query()
            ->where('roleId', 'R2')
            ->where('isActive', true)
            ->with(['doctorInfor.markdowns', 'doctorClinicSpecialties.clinic', 'doctorClinicSpecialties.specialty'])
            ->find($id);

        if (!$doctor) {
            return response()->json(['message' => 'Doctor not found'], 404);
        }

        return response()->json($doctor);
    }

    public function availability(int $id, Request $request): JsonResponse
    {
        $doctor = User::query()
            ->where('roleId', 'R2')
            ->where('isActive', true)
            ->find($id);
        if (!$doctor) {
            return response()->json(['message' => 'Doctor not found'], 404);
        }

        $validated = $request->validate([
            'date' => 'nullable|date',
        ]);

        $timeTypes = TimeHelper::timeTypeKeys();
        if (!empty($validated['date'])) {
            if (!TimeHelper::isDateWithinBookingWindow($validated['date'])) {
                return response()->json([]);
            }
            $dates = [$validated['date']];
        } else {
            $dates = TimeHelper::bookingDateStrings();
        }

        if ($dates === []) {
            return response()->json([]);
        }

        $existing = Schedule::query()
            ->where('doctorId', $doctor->id)
            ->whereIn('date', $dates)
            ->get()
            ->keyBy(fn (Schedule $slot) => "{$slot->date}|{$slot->timeType}");

        $rows = [];
        foreach ($dates as $date) {
            foreach ($timeTypes as $timeType) {
                /** @var Schedule|null $stored */
                $stored = $existing->get("{$date}|{$timeType}");
                $slot = [
                    'id' => $stored?->id,
                    'doctorId' => $doctor->id,
                    'date' => $date,
                    'timeType' => $timeType,
                    'currentNumber' => (int) ($stored?->currentNumber ?? 0),
                    'isActive' => $stored ? (bool) $stored->isActive : true,
                ];

                if ($slot['isActive'] && $slot['currentNumber'] < 1) {
                    $rows[] = $slot;
                }
            }
        }

        usort($rows, function (array $left, array $right): int {
            if ($left['date'] !== $right['date']) {
                return strcmp($left['date'], $right['date']);
            }

            $leftOrder = (int) preg_replace('/\D/', '', (string) $left['timeType']);
            $rightOrder = (int) preg_replace('/\D/', '', (string) $right['timeType']);
            return $leftOrder <=> $rightOrder;
        });

        return response()->json($rows);
    }
}
