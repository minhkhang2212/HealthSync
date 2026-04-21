<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Repositories\BookingRepository;
use App\Support\RevenueReportPdfBuilder;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

class BookingController extends Controller
{
    public function __construct(
        private readonly BookingRepository $bookingRepository
    ) {}

    public function index(): JsonResponse
    {
        $bookings = $this->bookingRepository->getAdminFeed();
        $now = now('Europe/London');

        return response()->json([
            'items' => $bookings,
            'total' => $bookings->count(),
            'recognizedRevenueAmount' => $this->bookingRepository->sumRecognizedRevenueBetween(
                $now->copy()->startOfMonth(),
                $now->copy()->endOfMonth()
            ),
            'recognizedRevenueCurrency' => 'gbp',
        ]);
    }

    public function monthlyRevenue(): JsonResponse
    {
        $now = now('Europe/London');

        return response()->json([
            'items' => $this->bookingRepository->getRecognizedRevenueMonthlySummary($now)->values(),
            'currentMonth' => $now->format('Y-m'),
            'recognizedRevenueCurrency' => 'gbp',
        ]);
    }

    public function monthlyRevenuePdf(string $month): Response|JsonResponse
    {
        if (!preg_match('/^\d{4}-\d{2}$/', $month)) {
            return response()->json([
                'message' => 'Invalid month format. Use YYYY-MM.',
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        try {
            $start = CarbonImmutable::createFromFormat('Y-m', $month, 'Europe/London')->startOfMonth();
        } catch (\Throwable) {
            return response()->json([
                'message' => 'Invalid month format. Use YYYY-MM.',
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $end = $start->endOfMonth();
        $entries = $this->bookingRepository->getRecognizedRevenueEntriesBetween($start, $end);
        $pdf = RevenueReportPdfBuilder::build(
            $start->format('F Y'),
            (int) $entries->sum('paymentAmount'),
            'gbp',
            $entries,
            now('Europe/London')
        );
        $filename = sprintf('healthsync-revenue-%s.pdf', $month);

        return response($pdf, Response::HTTP_OK, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => sprintf('attachment; filename="%s"', $filename),
            'Content-Length' => (string) strlen($pdf),
        ]);
    }
}
