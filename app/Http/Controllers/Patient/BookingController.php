<?php

namespace App\Http\Controllers\Patient;

use App\DTO\BookingDTO;
use App\Helpers\TimeHelper;
use App\Http\Controllers\Controller;
use App\Models\Allcode;
use App\Models\User;
use App\Services\BookingService;
use App\Services\StripeCheckoutService;
use App\Support\BookingErrorMessage;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;
use RuntimeException;

class BookingController extends Controller
{
    public function __construct(
        private readonly BookingService $bookingService,
        private readonly StripeCheckoutService $stripeCheckoutService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $bookings = $this->bookingService->getByPatientId($request->user()->id);

        return response()->json($bookings);
    }

    public function show(int $id, Request $request): JsonResponse
    {
        $booking = $this->bookingService->find($id);

        if (!$booking || $booking->patientId !== $request->user()->id) {
            return response()->json(['message' => 'Not found or unauthorized'], 404);
        }

        return response()->json($booking);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'doctorId' => 'required|integer|exists:users,id',
            'date' => 'required|date',
            'timeType' => ['required', 'string', Rule::in(TimeHelper::timeTypeKeys())],
            'patientContactEmail' => 'required|string|email|max:255',
            'bookingFor' => ['required', Rule::in(['self', 'family'])],
            'patientName' => 'required|string|max:255',
            'patientGender' => ['required', Rule::in(['M', 'F', 'O'])],
            'patientPhoneNumber' => 'required|string|max:30',
            'patientBirthYear' => 'required|integer|min:1900|max:' . now()->year,
            'patientProvince' => 'required|string|max:255',
            'patientDistrict' => 'required|string|max:255',
            'patientAddress' => 'required|string|max:255',
            'reasonForVisit' => 'required|string|max:1000',
            'paymentMethod' => ['required', Rule::in(['pay_at_clinic', 'stripe'])],
        ]);

        $doctorContext = $this->resolveDoctorContext((int) $validated['doctorId']);
        $this->assertPaymentMethodAllowed($doctorContext['paymentId'], $validated['paymentMethod']);
        $price = $this->resolveDoctorPrice($doctorContext['priceId'], $validated['paymentMethod'] === 'stripe');

        $dto = new BookingDTO(
            $request->user()->id,
            $validated['doctorId'],
            $validated['date'],
            $validated['timeType'],
            'S1',
            $validated['patientContactEmail'],
            $validated['paymentMethod'],
            $validated['paymentMethod'] === 'stripe' ? 'pending' : 'pay_at_clinic',
            $price['amount'],
            $price['currency'],
            $this->buildBookingDetails($validated)
        );

        try {
            $booking = $this->bookingService->createBooking($dto);

            if ($validated['paymentMethod'] !== 'stripe') {
                return response()->json($booking, 201);
            }

            $session = $this->stripeCheckoutService->createCheckoutSession(
                $this->buildStripeCheckoutPayload(
                    $booking->id,
                    $request->user()->id,
                    $doctorContext,
                    $validated['patientContactEmail'],
                    $price
                )
            );

            if (!is_string($session['id'] ?? null) || !is_string($session['url'] ?? null)) {
                throw new RuntimeException('Stripe checkout session could not be created.');
            }

            $expiresAt = isset($session['expires_at'])
                ? Carbon::createFromTimestamp((int) $session['expires_at'], 'Europe/London')
                : now('Europe/London')->addMinutes(30);

            $booking = $this->bookingService->attachStripeCheckoutSession(
                $booking->id,
                $session['id'],
                isset($session['payment_intent']) && is_string($session['payment_intent']) ? $session['payment_intent'] : null,
                $expiresAt
            );

            return response()->json([
                'booking' => $booking,
                'redirectUrl' => $session['url'],
            ], 201);
        } catch (Exception $exception) {
            if (isset($booking) && $validated['paymentMethod'] === 'stripe') {
                try {
                    $this->bookingService->cancelBooking($booking->id, $request->user()->id, 'R3');
                } catch (Exception) {
                    // Surface the original Stripe/booking error.
                }
            }

            report($exception);

            return response()->json([
                'message' => BookingErrorMessage::resolve(
                    $exception,
                    'Unable to create booking right now. Please try again.'
                ),
            ], 422);
        }
    }

    public function cancel(int $id, Request $request): JsonResponse
    {
        $booking = $this->bookingService->find($id);

        if (!$booking || $booking->patientId !== $request->user()->id) {
            return response()->json(['message' => 'Not found or unauthorized'], 404);
        }

        try {
            $booking = $this->bookingService->cancelBooking($id, $request->user()->id, 'R3');

            if (
                $booking->paymentMethod === 'stripe'
                && in_array($booking->paymentStatus, ['cancelled', 'expired'], true)
                && is_string($booking->stripeCheckoutSessionId)
                && $booking->stripeCheckoutSessionId !== ''
            ) {
                $this->stripeCheckoutService->expireCheckoutSession($booking->stripeCheckoutSessionId);
            }

            return response()->json($booking);
        } catch (Exception $exception) {
            report($exception);

            return response()->json([
                'message' => BookingErrorMessage::resolve(
                    $exception,
                    'Unable to cancel the booking right now. Please try again.'
                ),
            ], 422);
        }
    }

    private function buildBookingDetails(array $validated): array
    {
        return [
            'bookingFor' => $validated['bookingFor'],
            'patientName' => $validated['patientName'],
            'patientGender' => $validated['patientGender'],
            'patientPhoneNumber' => $validated['patientPhoneNumber'],
            'patientBirthYear' => (int) $validated['patientBirthYear'],
            'patientProvince' => $validated['patientProvince'],
            'patientDistrict' => $validated['patientDistrict'],
            'patientAddress' => $validated['patientAddress'],
            'reasonForVisit' => $validated['reasonForVisit'],
        ];
    }

    private function resolveDoctorContext(int $doctorId): array
    {
        $doctor = User::query()
            ->with([
                'doctorInfor',
                'doctorClinicSpecialties.clinic:id,name',
                'doctorClinicSpecialties.specialty:id,name',
            ])
            ->find($doctorId);

        if (!$doctor || !$doctor->doctorInfor) {
            throw new RuntimeException('Doctor profile is not ready for booking.');
        }

        $mapping = $doctor->doctorClinicSpecialties->first();
        $doctorInfor = $doctor->doctorInfor;

        return [
            'doctor' => $doctor,
            'priceId' => $doctorInfor->priceId,
            'paymentId' => $doctorInfor->paymentId,
            'clinicName' => $mapping?->clinic?->name ?: ($doctorInfor->nameClinic ?: 'Clinic consultation'),
            'specialtyName' => $mapping?->specialty?->name ?: 'General consultation',
        ];
    }

    private function assertPaymentMethodAllowed(?string $paymentId, string $paymentMethod): void
    {
        $supportsPayAtClinic = $paymentId !== 'PAY2';
        $supportsStripe = $paymentId !== 'PAY1';

        if ($paymentMethod === 'pay_at_clinic' && !$supportsPayAtClinic) {
            throw new RuntimeException('This doctor currently accepts online payment only.');
        }

        if ($paymentMethod === 'stripe') {
            if (!$supportsStripe) {
                throw new RuntimeException('Online payment is not available for this doctor yet.');
            }

            if (!$this->stripeCheckoutService->isConfigured()) {
                throw new RuntimeException('Online payment is not configured yet. Please use Pay at clinic for now.');
            }
        }
    }

    private function resolveDoctorPrice(?string $priceId, bool $isRequired): array
    {
        if (!$priceId) {
            if ($isRequired) {
                throw new RuntimeException('The consultation fee is unavailable for online payment.');
            }

            return [
                'amount' => null,
                'currency' => 'gbp',
                'label' => null,
            ];
        }

        $value = Allcode::query()
            ->where('type', 'PRICE')
            ->where('key', $priceId)
            ->value('valueEn');

        if (!is_string($value) || trim($value) === '') {
            if ($isRequired) {
                throw new RuntimeException('The consultation fee is unavailable for online payment.');
            }

            return [
                'amount' => null,
                'currency' => 'gbp',
                'label' => null,
            ];
        }

        if (!preg_match('/(\d+(?:\.\d+)?)\s*GBP/i', $value, $matches)) {
            throw new RuntimeException('Unsupported consultation fee format for online payment.');
        }

        return [
            'amount' => (int) round(((float) $matches[1]) * 100),
            'currency' => 'gbp',
            'label' => $value,
        ];
    }

    private function buildStripeCheckoutPayload(
        int $bookingId,
        int $patientId,
        array $doctorContext,
        string $customerEmail,
        array $price
    ): array {
        $frontendUrl = rtrim((string) config('services.frontend.url'), '/');
        $doctorId = (int) $doctorContext['doctor']->id;
        $doctorName = (string) $doctorContext['doctor']->name;
        $clinicName = (string) $doctorContext['clinicName'];
        $specialtyName = (string) $doctorContext['specialtyName'];
        $expiresAt = now('Europe/London')->addMinutes(30)->timestamp;

        return [
            'mode' => 'payment',
            'success_url' => "{$frontendUrl}/patient/bookings/{$bookingId}/payment?checkout=success&session_id={CHECKOUT_SESSION_ID}",
            'cancel_url' => "{$frontendUrl}/patient/bookings/{$bookingId}/payment?checkout=cancelled",
            'customer_email' => $customerEmail,
            'client_reference_id' => (string) $bookingId,
            'payment_method_types[0]' => 'card',
            'expires_at' => $expiresAt,
            'metadata[booking_id]' => (string) $bookingId,
            'metadata[patient_id]' => (string) $patientId,
            'metadata[doctor_id]' => (string) $doctorId,
            'payment_intent_data[metadata][booking_id]' => (string) $bookingId,
            'line_items[0][quantity]' => 1,
            'line_items[0][price_data][currency]' => (string) $price['currency'],
            'line_items[0][price_data][unit_amount]' => (string) $price['amount'],
            'line_items[0][price_data][product_data][name]' => "Consultation with {$doctorName}",
            'line_items[0][price_data][product_data][description]' => "{$specialtyName} at {$clinicName}",
        ];
    }
}
