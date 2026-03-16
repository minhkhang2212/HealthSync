<?php

namespace App\Http\Controllers\Doctor;

use App\Http\Controllers\Controller;
use App\Services\BookingNotificationService;
use App\Services\BookingService;
use App\Support\BookingErrorMessage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Exception;
use Illuminate\Support\Facades\Storage;

class DoctorBookingController extends Controller
{
    public function __construct(
        private readonly BookingService $bookingService,
        private readonly BookingNotificationService $bookingNotificationService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'date' => 'nullable|date',
        ]);

        $doctorId = $request->user()->id;
        $bookings = $this->bookingService->getByDoctorIdForDate($doctorId, $validated['date'] ?? null);
        
        return response()->json($bookings);
    }

    public function cancel(int $id, Request $request): JsonResponse
    {
        $booking = $this->bookingService->find($id);
        
        if (!$booking || $booking->doctorId !== $request->user()->id) {
            return response()->json(['message' => 'Not found or unauthorized'], 404);
        }

        try {
            $booking = $this->bookingService->cancelBooking($id, $request->user()->id, 'R2');
            return response()->json($booking);
        } catch (Exception $e) {
            report($e);

            return response()->json([
                'message' => BookingErrorMessage::resolve(
                    $e,
                    'Unable to cancel the appointment right now. Please try again.'
                ),
            ], 422);
        }
    }

    public function confirm(int $id, Request $request): JsonResponse
    {
        $booking = $this->bookingService->find($id);
        
        if (!$booking || $booking->doctorId !== $request->user()->id) {
            return response()->json(['message' => 'Not found or unauthorized'], 404);
        }

        $request->validate([
            'confirmationFile' => 'nullable|file|max:10240',
        ]);

        $attachmentPath = null;
        try {
            if ($request->hasFile('confirmationFile')) {
                $attachmentPath = $this->storePublicFile($request->file('confirmationFile'), 'booking-confirmations');
            }

            $booking = $this->bookingService->confirmBooking($id, $attachmentPath);
            $this->bookingNotificationService->sendConfirmation($booking);
            return response()->json($booking);
        } catch (Exception $e) {
            if ($this->bookingHasDoctorAccess($booking, $request)) {
                $this->bookingService->update($booking->id, [
                    'confirmedAt' => null,
                    'confirmationAttachment' => null,
                ]);
            }

            $this->deletePublicFile($attachmentPath);
            report($e);

            return response()->json([
                'message' => BookingErrorMessage::resolve(
                    $e,
                    'Unable to send the confirmation right now. Please try again.'
                ),
            ], 422);
        }
    }

    public function markDone(int $id, Request $request): JsonResponse
    {
        return $this->sendPrescription($id, $request);
    }

    public function sendPrescription(int $id, Request $request): JsonResponse
    {
        $booking = $this->bookingService->find($id);
        
        if (!$booking || $booking->doctorId !== $request->user()->id) {
            return response()->json(['message' => 'Not found or unauthorized'], 404);
        }

        $request->validate([
            'prescriptionFile' => 'required|file|max:10240',
        ]);

        $attachmentPath = null;
        try {
            $attachmentPath = $this->storePublicFile($request->file('prescriptionFile'), 'booking-prescriptions');
            $booking = $this->bookingService->sendPrescription($id, $attachmentPath);
            $this->bookingNotificationService->sendPrescription($booking);
            return response()->json($booking);
        } catch (Exception $e) {
            if ($this->bookingHasDoctorAccess($booking, $request)) {
                $this->bookingService->update($booking->id, [
                    'statusId' => 'S1',
                    'prescriptionSentAt' => null,
                    'prescriptionAttachment' => null,
                ]);
            }

            $this->deletePublicFile($attachmentPath);
            report($e);

            return response()->json([
                'message' => BookingErrorMessage::resolve(
                    $e,
                    'Unable to send the prescription right now. Please try again.'
                ),
            ], 422);
        }
    }

    public function markNoShow(int $id, Request $request): JsonResponse
    {
        $booking = $this->bookingService->find($id);
        
        if (!$booking || $booking->doctorId !== $request->user()->id) {
            return response()->json(['message' => 'Not found or unauthorized'], 404);
        }

        try {
            $booking = $this->bookingService->markNoShowByDoctor($id);
            return response()->json($booking);
        } catch (Exception $e) {
            report($e);

            return response()->json([
                'message' => BookingErrorMessage::resolve(
                    $e,
                    'Unable to mark the appointment as no-show right now. Please try again.'
                ),
            ], 422);
        }
    }

    private function bookingHasDoctorAccess($booking, Request $request): bool
    {
        return $booking && $booking->doctorId === $request->user()->id;
    }

    private function storePublicFile($file, string $directory): string
    {
        $path = $file->store($directory, 'public');
        return "/storage/{$path}";
    }

    private function deletePublicFile(?string $publicPath): void
    {
        if (!is_string($publicPath) || !str_starts_with($publicPath, '/storage/')) {
            return;
        }

        Storage::disk('public')->delete(substr($publicPath, strlen('/storage/')));
    }
}
