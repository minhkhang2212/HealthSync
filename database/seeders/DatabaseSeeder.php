<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            RoleSeeder::class,
            AllcodeSeeder::class,
        ]);

        // Demo accounts for quick login testing (all use the same password).
        // Password: password123
        $demoUsers = [
            [
                'name' => 'System Admin',
                'email' => 'admin@healthsync.com',
                'password' => 'password123',
                'password' => 'password123',
                'roleId' => 'R1',
                'positionId' => null,
                'gender' => null,
                'phoneNumber' => '0700000000',
                'isActive' => true,
            ],
            [
                'name' => 'Dr John Carter',
                'email' => 'doctor1@healthsync.com',
                'password' => 'password123',
                'roleId' => 'R2',
                'positionId' => 'P0',
                'gender' => 'M',
                'phoneNumber' => '0700000001',
                'isActive' => true,
            ],
            [
                'name' => 'Dr Emily Stone',
                'email' => 'doctor2@healthsync.com',
                'password' => 'password123',
                'roleId' => 'R2',
                'positionId' => 'P1',
                'gender' => 'F',
                'phoneNumber' => '0700000002',
                'isActive' => true,
            ],
            [
                'name' => 'Patient Liam Brown',
                'email' => 'patient1@healthsync.com',
                'password' => 'password123',
                'roleId' => 'R3',
                'positionId' => null,
                'gender' => 'M',
                'phoneNumber' => '0700000003',
                'isActive' => true,
            ],
            [
                'name' => 'Patient Olivia Green',
                'email' => 'patient2@healthsync.com',
                'password' => 'password123',
                'roleId' => 'R3',
                'positionId' => null,
                'gender' => 'F',
                'phoneNumber' => '0700000004',
                'isActive' => true,
            ],
        ];

        foreach ($demoUsers as $data) {
            $user = User::updateOrCreate(
                ['email' => $data['email']],
                [
                    'name' => $data['name'],
                    'password' => Hash::make($data['password']),
                    'roleId' => $data['roleId'],
                    'positionId' => $data['positionId'],
                    'gender' => $data['gender'],
                    'phoneNumber' => $data['phoneNumber'],
                    'isActive' => $data['isActive'] ?? true,
                ]
            );

            $user->syncRoles([$data['roleId']]);
        }
    }
}
