<?php

namespace App\Services\Ai;

use App\Helpers\TimeHelper;
use App\Models\Clinic;
use App\Models\Schedule;
use App\Models\Specialty;
use App\Models\User;
use Illuminate\Support\Collection;

class AiTriageRecommender
{
    /**
     * @param array<string, mixed> $triage
     * @return array{
     *     triage: array<string, mixed>,
     *     recommendations: array{
     *         doctorRecommendations: array<int, array<string, mixed>>,
     *         slotRecommendations: array<int, array<string, mixed>>,
     *         prefill: array<string, mixed>|null
     *     }
     * }
     */
    public function build(array $triage): array
    {
        $mappedCandidates = $this->mapSpecialtyCandidates($triage['specialtyCandidates'] ?? []);
        $needsMoreInformation = (bool) ($triage['needsMoreInformation'] ?? false);

        $normalizedTriage = [
            'readyForAssessment' => !$needsMoreInformation,
            'needsMoreInformation' => $needsMoreInformation,
            'urgency' => $needsMoreInformation ? null : $this->normalizeUrgency($triage['urgency'] ?? null),
            'explanation' => (string) ($triage['explanation'] ?? ''),
            'redFlags' => array_values(array_filter(array_map('strval', $triage['redFlags'] ?? []))),
            'symptomSummary' => (string) ($triage['symptomSummary'] ?? ''),
            'specialtyCandidates' => $needsMoreInformation ? [] : $mappedCandidates,
        ];

        if ($needsMoreInformation) {
            return [
                'triage' => $normalizedTriage,
                'recommendations' => [
                    'doctorRecommendations' => [],
                    'slotRecommendations' => [],
                    'prefill' => null,
                ],
            ];
        }

        if ($normalizedTriage['urgency'] === 'emergency') {
            return [
                'triage' => $normalizedTriage,
                'recommendations' => [
                    'doctorRecommendations' => [],
                    'slotRecommendations' => [],
                    'prefill' => null,
                ],
            ];
        }

        $locationHints = array_values(array_filter(array_map('strval', $triage['locationHints'] ?? [])));
        $rankedDoctors = $this->rankDoctors($mappedCandidates, $locationHints);

        $doctorRecommendations = [];
        $slotRecommendations = [];

        foreach (array_slice($rankedDoctors, 0, 3) as $doctorContext) {
            $doctorRecommendations[] = $doctorContext['doctorRecommendation'];
            if (isset($doctorContext['slotRecommendation']) && count($slotRecommendations) < 3) {
                $slotRecommendations[] = $doctorContext['slotRecommendation'];
            }
        }

        $prefill = null;
        if ($slotRecommendations !== []) {
            $topSlot = $slotRecommendations[0];
            $topCandidate = $mappedCandidates[0] ?? null;
            $prefill = [
                'specialtyId' => $topSlot['specialtyId'] ?? ($topCandidate['id'] ?? null),
                'specialtyName' => $topSlot['specialtyName'] ?? ($topCandidate['name'] ?? null),
                'locationQuery' => $locationHints[0] ?? '',
                'reasonForVisit' => (string) ($triage['reasonForVisit'] ?? $normalizedTriage['symptomSummary']),
                'doctorId' => $topSlot['doctorId'],
                'date' => $topSlot['date'],
                'timeType' => $topSlot['timeType'],
            ];
        }

        return [
            'triage' => $normalizedTriage,
            'recommendations' => [
                'doctorRecommendations' => $doctorRecommendations,
                'slotRecommendations' => $slotRecommendations,
                'prefill' => $prefill,
            ],
        ];
    }

    /**
     * @param array<int, array<string, mixed>> $candidates
     * @return array<int, array<string, mixed>>
     */
    public function mapSpecialtyCandidates(array $candidates): array
    {
        /** @var Collection<int, Specialty> $specialties */
        $specialties = Specialty::query()->get();

        return collect($candidates)
            ->take(3)
            ->map(function (array $candidate) use ($specialties): array {
                $candidateName = trim((string) ($candidate['name'] ?? ''));
                $matched = $candidateName === '' ? null : $this->matchSpecialty($candidateName, $specialties);

                return [
                    'id' => $matched?->id,
                    'name' => $matched?->name ?? $candidateName,
                    'reason' => (string) ($candidate['reason'] ?? ''),
                    'confidence' => $this->normalizeConfidence($candidate['confidence'] ?? 0),
                ];
            })
            ->filter(fn (array $candidate) => $candidate['name'] !== '')
            ->values()
            ->all();
    }

    /**
     * @param array<int, array<string, mixed>> $mappedCandidates
     * @param array<int, string> $locationHints
     * @return array<int, array<string, mixed>>
     */
    public function rankDoctors(array $mappedCandidates, array $locationHints): array
    {
        $matchedSpecialtyIds = collect($mappedCandidates)
            ->pluck('id')
            ->filter()
            ->map(fn ($value) => (int) $value)
            ->values();

        $candidateConfidenceBySpecialtyId = collect($mappedCandidates)
            ->filter(fn (array $candidate) => isset($candidate['id']))
            ->mapWithKeys(fn (array $candidate) => [(int) $candidate['id'] => (float) $candidate['confidence']]);

        /** @var Collection<int, User> $doctors */
        $doctors = User::query()
            ->where('roleId', 'R2')
            ->where('isActive', true)
            ->with([
                'doctorInfor.markdowns',
                'doctorClinicSpecialties.clinic',
                'doctorClinicSpecialties.specialty',
            ])
            ->get();

        $doctorIds = $doctors->pluck('id')->all();
        if ($doctorIds === []) {
            return [];
        }

        $scheduleByKey = $this->loadSchedulesForDoctors($doctorIds);

        return $doctors
            ->map(function (User $doctor) use ($matchedSpecialtyIds, $candidateConfidenceBySpecialtyId, $locationHints, $scheduleByKey): ?array {
                $mapping = $doctor->doctorClinicSpecialties->first();
                $specialty = $mapping?->specialty;
                $clinic = $mapping?->clinic;

                if (!$specialty || !$clinic) {
                    return null;
                }

                $specialtyRank = $matchedSpecialtyIds->search((int) $specialty->id);
                if ($matchedSpecialtyIds->isNotEmpty() && $specialtyRank === false) {
                    return null;
                }

                $earliestSlot = $this->findEarliestOpenSlot((int) $doctor->id, $scheduleByKey);
                if ($earliestSlot === null) {
                    return null;
                }

                $specialtyScore = $specialtyRank === false
                    ? 0
                    : max(0, 120 - (((int) $specialtyRank) * 30)) + (int) round(($candidateConfidenceBySpecialtyId[(int) $specialty->id] ?? 0) * 10);
                $locationScore = $this->scoreLocationMatch($locationHints, $doctor, $clinic);
                $availabilityScore = max(0, 30 - (int) $earliestSlot['dayOffset']);
                $totalScore = $specialtyScore + $locationScore + $availabilityScore;
                $reasonParts = [];

                if ($specialtyRank !== false) {
                    $reasonParts[] = "Matches {$specialty->name}";
                }
                if ($locationScore > 0) {
                    $reasonParts[] = "near {$clinic->name}";
                }
                $reasonParts[] = "earliest slot {$earliestSlot['dateLabel']} at {$earliestSlot['timeLabel']}";

                $doctorRecommendation = [
                    'doctorId' => (int) $doctor->id,
                    'doctorName' => (string) $doctor->name,
                    'doctorImage' => $doctor->image,
                    'clinicId' => (int) $clinic->id,
                    'clinicName' => (string) $clinic->name,
                    'clinicAddress' => (string) ($clinic->address ?? $doctor->doctorInfor?->addressClinic ?? ''),
                    'specialtyId' => (int) $specialty->id,
                    'specialtyName' => (string) $specialty->name,
                    'reason' => implode(', ', $reasonParts),
                    'earliestAvailable' => [
                        'date' => $earliestSlot['date'],
                        'timeType' => $earliestSlot['timeType'],
                        'timeLabel' => $earliestSlot['timeLabel'],
                        'dateLabel' => $earliestSlot['dateLabel'],
                    ],
                    'score' => $totalScore,
                ];

                return [
                    'score' => $totalScore,
                    'slotDate' => $earliestSlot['date'],
                    'slotOrder' => (int) preg_replace('/\D/', '', (string) $earliestSlot['timeType']),
                    'doctorRecommendation' => $doctorRecommendation,
                    'slotRecommendation' => [
                        'doctorId' => (int) $doctor->id,
                        'doctorName' => (string) $doctor->name,
                        'clinicId' => (int) $clinic->id,
                        'clinicName' => (string) $clinic->name,
                        'specialtyId' => (int) $specialty->id,
                        'specialtyName' => (string) $specialty->name,
                        'date' => $earliestSlot['date'],
                        'dateLabel' => $earliestSlot['dateLabel'],
                        'timeType' => $earliestSlot['timeType'],
                        'timeLabel' => $earliestSlot['timeLabel'],
                        'reason' => implode(', ', $reasonParts),
                    ],
                ];
            })
            ->filter()
            ->sort(function (array $left, array $right): int {
                if ($left['score'] !== $right['score']) {
                    return $right['score'] <=> $left['score'];
                }

                if ($left['slotDate'] !== $right['slotDate']) {
                    return strcmp($left['slotDate'], $right['slotDate']);
                }

                return $left['slotOrder'] <=> $right['slotOrder'];
            })
            ->values()
            ->all();
    }

    private function normalizeUrgency(mixed $urgency): string
    {
        $normalized = strtolower(trim((string) $urgency));

        return in_array($normalized, ['low', 'medium', 'urgent', 'emergency'], true)
            ? $normalized
            : 'medium';
    }

    private function normalizeConfidence(mixed $value): float
    {
        $confidence = (float) $value;

        if ($confidence < 0) {
            return 0.0;
        }

        if ($confidence > 1) {
            return 1.0;
        }

        return round($confidence, 2);
    }

    /**
     * @param Collection<int, Specialty> $specialties
     */
    private function matchSpecialty(string $candidateName, Collection $specialties): ?Specialty
    {
        $needle = $this->normalizeSearchText($candidateName);

        return $specialties
            ->sortBy(function (Specialty $specialty) use ($needle): array {
                $haystack = $this->normalizeSearchText((string) $specialty->name);

                return [
                    $needle === $haystack ? 0 : 1,
                    str_contains($haystack, $needle) || str_contains($needle, $haystack) ? 0 : 1,
                    levenshtein($needle, $haystack),
                ];
            })
            ->first();
    }

    /**
     * @param array<int, int> $doctorIds
     * @return array<string, Schedule>
     */
    private function loadSchedulesForDoctors(array $doctorIds): array
    {
        $dates = TimeHelper::bookingDateStrings();
        $startDate = $dates[0] ?? now('Europe/London')->toDateString();
        $endDate = $dates[count($dates) - 1] ?? $startDate;

        return Schedule::query()
            ->whereIn('doctorId', $doctorIds)
            ->whereDate('date', '>=', $startDate)
            ->whereDate('date', '<=', $endDate)
            ->get()
            ->keyBy(fn (Schedule $schedule) => $this->scheduleKey((int) $schedule->doctorId, (string) $schedule->date, (string) $schedule->timeType))
            ->all();
    }

    /**
     * @param array<string, Schedule> $scheduleByKey
     * @return array<string, mixed>|null
     */
    private function findEarliestOpenSlot(int $doctorId, array $scheduleByKey): ?array
    {
        $dates = TimeHelper::bookingDateStrings();
        $timeTypes = TimeHelper::timeTypeKeys();

        foreach ($dates as $dayOffset => $date) {
            foreach ($timeTypes as $timeType) {
                $key = $this->scheduleKey($doctorId, $date, $timeType);
                /** @var Schedule|null $stored */
                $stored = $scheduleByKey[$key] ?? null;
                $isActive = $stored ? (bool) $stored->isActive : true;
                $currentNumber = (int) ($stored?->currentNumber ?? 0);

                if ($isActive && $currentNumber < 1 && TimeHelper::isBookingWindowValid($date, $timeType)) {
                    return [
                        'date' => $date,
                        'dateLabel' => TimeHelper::parseLondon($date)->format('D, d M Y'),
                        'timeType' => $timeType,
                        'timeLabel' => TimeHelper::timeLabelFor($timeType),
                        'dayOffset' => $dayOffset,
                    ];
                }
            }
        }

        return null;
    }

    private function scoreLocationMatch(array $locationHints, User $doctor, Clinic $clinic): int
    {
        if ($locationHints === []) {
            return 0;
        }

        $haystack = $this->normalizeSearchText(implode(' ', array_filter([
            $clinic->name,
            $clinic->address,
            $doctor->doctorInfor?->nameClinic,
            $doctor->doctorInfor?->addressClinic,
        ])));

        $score = 0;
        foreach ($locationHints as $hint) {
            $normalizedHint = $this->normalizeSearchText($hint);
            if ($normalizedHint !== '' && str_contains($haystack, $normalizedHint)) {
                $score += 15;
            }
        }

        return $score;
    }

    private function scheduleKey(int $doctorId, string $date, string $timeType): string
    {
        return "{$doctorId}|{$date}|{$timeType}";
    }

    private function normalizeSearchText(?string $value): string
    {
        $normalized = trim((string) $value);
        if ($normalized === '') {
            return '';
        }

        $ascii = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $normalized);
        $ascii = is_string($ascii) ? $ascii : $normalized;

        return strtolower($ascii);
    }
}
