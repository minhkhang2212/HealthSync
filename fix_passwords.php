use App\Models\User;
use Illuminate\Support\Facades\Hash;

$admin = User::where('email', 'admin@healthsync.com')->first();
if ($admin) {
    $admin->password = Hash::make('password');
    $admin->save();
    echo "Admin password updated\n";
} else {
    echo "Admin not found\n";
}

$patient = User::where('email', 'patient@test.com')->first();
if ($patient) {
    $patient->password = Hash::make('password');
    $patient->save();
    echo "Patient password updated\n";
} else {
    echo "Patient not found\n";
}
