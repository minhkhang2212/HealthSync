<?php

namespace Database\Seeders;

use App\Helpers\TimeHelper;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class AllcodeSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $allcodes = [
            // STATUS
            ['type' => 'STATUS', 'key' => 'S1', 'valueEn' => 'New'],
            ['type' => 'STATUS', 'key' => 'S2', 'valueEn' => 'Cancelled'],
            ['type' => 'STATUS', 'key' => 'S3', 'valueEn' => 'Done'],
            ['type' => 'STATUS', 'key' => 'S4', 'valueEn' => 'No-show'],

            // POSITION
            ['type' => 'POSITION', 'key' => 'P0', 'valueEn' => 'Doctor'],
            ['type' => 'POSITION', 'key' => 'P1', 'valueEn' => 'Master'],
            ['type' => 'POSITION', 'key' => 'P2', 'valueEn' => 'PhD'],
            ['type' => 'POSITION', 'key' => 'P3', 'valueEn' => 'Associate Professor'],
            ['type' => 'POSITION', 'key' => 'P4', 'valueEn' => 'Professor'],

            // GENDER
            ['type' => 'GENDER', 'key' => 'M', 'valueEn' => 'Male'],
            ['type' => 'GENDER', 'key' => 'F', 'valueEn' => 'Female'],
            ['type' => 'GENDER', 'key' => 'O', 'valueEn' => 'Other'],

            // ROLE
            ['type' => 'ROLE', 'key' => 'R1', 'valueEn' => 'Admin'],
            ['type' => 'ROLE', 'key' => 'R2', 'valueEn' => 'Doctor'],
            ['type' => 'ROLE', 'key' => 'R3', 'valueEn' => 'Patient'],

            // PRICE
            ['type' => 'PRICE', 'key' => 'PRI1', 'valueEn' => '10 GBP'],
            ['type' => 'PRICE', 'key' => 'PRI2', 'valueEn' => '15 GBP'],
            ['type' => 'PRICE', 'key' => 'PRI3', 'valueEn' => '20 GBP'],
            ['type' => 'PRICE', 'key' => 'PRI4', 'valueEn' => '25 GBP'],
            ['type' => 'PRICE', 'key' => 'PRI5', 'valueEn' => '30 GBP'],

            // PAYMENT
            ['type' => 'PAYMENT', 'key' => 'PAY1', 'valueEn' => 'Cash'],
            ['type' => 'PAYMENT', 'key' => 'PAY2', 'valueEn' => 'Credit Card'],
            ['type' => 'PAYMENT', 'key' => 'PAY3', 'valueEn' => 'All'],

            // PROVINCE
            ['type' => 'PROVINCE', 'key' => 'PRO1', 'valueEn' => 'London'],
            ['type' => 'PROVINCE', 'key' => 'PRO2', 'valueEn' => 'Manchester'],
            ['type' => 'PROVINCE', 'key' => 'PRO3', 'valueEn' => 'Birmingham'],
            ['type' => 'PROVINCE', 'key' => 'PRO4', 'valueEn' => 'Leeds'],
            ['type' => 'PROVINCE', 'key' => 'PRO5', 'valueEn' => 'Bristol'],
            ['type' => 'PROVINCE', 'key' => 'PRO6', 'valueEn' => 'Liverpool'],
        ];

        $allcodes = array_merge(
            $allcodes,
            TimeHelper::timeSlotAllcodeRecords()
        );

        foreach ($allcodes as $code) {
            DB::table('allcodes')->updateOrInsert(
                ['type' => $code['type'], 'key' => $code['key']],
                $code
            );
        }
    }
}
