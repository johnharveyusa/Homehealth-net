export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-white px-6">
      <div className="text-center max-w-xl">

        {/* Title */}
        <h1 className="text-4xl font-bold mb-4">
          HomeHealth Dashboard
        </h1>

        {/* Subtitle */}
        <p className="text-gray-600 mb-8">
          Welcome. This is the prototype system for nurses and staff.
        </p>

        {/* Login Link */}
        <a
          href="/login"
          className="inline-block px-8 py-3 rounded-xl bg-black text-white font-medium hover:bg-gray-800 transition"
        >
          Nurse Login →
        </a>

      </div>
    </main>
  );
}
