<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RoleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[PermissionRegistrar::class]->forgetCachedPermissions();

        // Create roles
        Role::updateOrCreate(['name' => 'R1'], ['guard_name' => 'web']); // Admin
        Role::updateOrCreate(['name' => 'R2'], ['guard_name' => 'web']); // Doctor
        Role::updateOrCreate(['name' => 'R3'], ['guard_name' => 'web']); // Patient
    }
}
