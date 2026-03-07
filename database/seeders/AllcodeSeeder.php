<?php

namespace Database\Seeders;

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
            ['type' => 'STATUS', 'key' => 'S1', 'valueEn' => 'New', 'valueVi' => 'Lich hen moi'],
            ['type' => 'STATUS', 'key' => 'S2', 'valueEn' => 'Cancelled', 'valueVi' => 'Da huy'],
            ['type' => 'STATUS', 'key' => 'S3', 'valueEn' => 'Done', 'valueVi' => 'Da kham xong'],
            ['type' => 'STATUS', 'key' => 'S4', 'valueEn' => 'No-show', 'valueVi' => 'Vang mat'],

            // TIME
            ['type' => 'TIME', 'key' => 'T1', 'valueEn' => '8:00 AM - 9:00 AM', 'valueVi' => '8:00 - 9:00'],
            ['type' => 'TIME', 'key' => 'T2', 'valueEn' => '9:00 AM - 10:00 AM', 'valueVi' => '9:00 - 10:00'],
            ['type' => 'TIME', 'key' => 'T3', 'valueEn' => '10:00 AM - 11:00 AM', 'valueVi' => '10:00 - 11:00'],
            ['type' => 'TIME', 'key' => 'T4', 'valueEn' => '11:00 AM - 12:00 PM', 'valueVi' => '11:00 - 12:00'],
            ['type' => 'TIME', 'key' => 'T5', 'valueEn' => '1:00 PM - 2:00 PM', 'valueVi' => '13:00 - 14:00'],
            ['type' => 'TIME', 'key' => 'T6', 'valueEn' => '2:00 PM - 3:00 PM', 'valueVi' => '14:00 - 15:00'],
            ['type' => 'TIME', 'key' => 'T7', 'valueEn' => '3:00 PM - 4:00 PM', 'valueVi' => '15:00 - 16:00'],
            ['type' => 'TIME', 'key' => 'T8', 'valueEn' => '4:00 PM - 5:00 PM', 'valueVi' => '16:00 - 17:00'],

            // POSITION
            ['type' => 'POSITION', 'key' => 'P0', 'valueEn' => 'Doctor', 'valueVi' => 'Bac si'],
            ['type' => 'POSITION', 'key' => 'P1', 'valueEn' => 'Master', 'valueVi' => 'Thac si'],
            ['type' => 'POSITION', 'key' => 'P2', 'valueEn' => 'PhD', 'valueVi' => 'Tien si'],
            ['type' => 'POSITION', 'key' => 'P3', 'valueEn' => 'Associate Professor', 'valueVi' => 'Pho giao su'],
            ['type' => 'POSITION', 'key' => 'P4', 'valueEn' => 'Professor', 'valueVi' => 'Giao su'],

            // GENDER
            ['type' => 'GENDER', 'key' => 'M', 'valueEn' => 'Male', 'valueVi' => 'Nam'],
            ['type' => 'GENDER', 'key' => 'F', 'valueEn' => 'Female', 'valueVi' => 'Nu'],
            ['type' => 'GENDER', 'key' => 'O', 'valueEn' => 'Other', 'valueVi' => 'Khac'],

            // ROLE
            ['type' => 'ROLE', 'key' => 'R1', 'valueEn' => 'Admin', 'valueVi' => 'Quan tri vien'],
            ['type' => 'ROLE', 'key' => 'R2', 'valueEn' => 'Doctor', 'valueVi' => 'Bac si'],
            ['type' => 'ROLE', 'key' => 'R3', 'valueEn' => 'Patient', 'valueVi' => 'Benh nhan'],

            // PRICE
            ['type' => 'PRICE', 'key' => 'PRI1', 'valueEn' => '10 GBP', 'valueVi' => '250000'],
            ['type' => 'PRICE', 'key' => 'PRI2', 'valueEn' => '15 GBP', 'valueVi' => '300000'],
            ['type' => 'PRICE', 'key' => 'PRI3', 'valueEn' => '20 GBP', 'valueVi' => '400000'],
            ['type' => 'PRICE', 'key' => 'PRI4', 'valueEn' => '25 GBP', 'valueVi' => '500000'],
            ['type' => 'PRICE', 'key' => 'PRI5', 'valueEn' => '30 GBP', 'valueVi' => '600000'],

            // PAYMENT
            ['type' => 'PAYMENT', 'key' => 'PAY1', 'valueEn' => 'Cash', 'valueVi' => 'Tien mat'],
            ['type' => 'PAYMENT', 'key' => 'PAY2', 'valueEn' => 'Credit Card', 'valueVi' => 'The ATM'],
            ['type' => 'PAYMENT', 'key' => 'PAY3', 'valueEn' => 'All', 'valueVi' => 'Tat ca'],

            // PROVINCE
            ['type' => 'PROVINCE', 'key' => 'PRO1', 'valueEn' => 'London', 'valueVi' => 'London'],
            ['type' => 'PROVINCE', 'key' => 'PRO2', 'valueEn' => 'Manchester', 'valueVi' => 'Manchester'],
            ['type' => 'PROVINCE', 'key' => 'PRO3', 'valueEn' => 'Birmingham', 'valueVi' => 'Birmingham'],
            ['type' => 'PROVINCE', 'key' => 'PRO4', 'valueEn' => 'Leeds', 'valueVi' => 'Leeds'],
            ['type' => 'PROVINCE', 'key' => 'PRO5', 'valueEn' => 'Bristol', 'valueVi' => 'Bristol'],
            ['type' => 'PROVINCE', 'key' => 'PRO6', 'valueEn' => 'Liverpool', 'valueVi' => 'Liverpool'],
        ];

        foreach ($allcodes as $code) {
            DB::table('allcodes')->updateOrInsert(
                ['type' => $code['type'], 'key' => $code['key']],
                $code
            );
        }
    }
}
