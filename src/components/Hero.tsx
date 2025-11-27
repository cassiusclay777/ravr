import React from 'react';

export default function Hero() {
  return (
    <section className="bg-gradient-to-br from-neutral-900 to-black py-16 px-4 text-center">
      <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
        Vítej v RAVR — temnota nikdy nezněla líp
      </h1>
      <p className="text-lg text-gray-400 mb-8">
        Undergroundový audio přehrávač pro techno komunitu.
      </p>
      <a href="#download" className="bg-pink-600 text-white px-6 py-3 rounded-xl shadow hover:bg-pink-700 transition">
        Stáhnout teď
      </a>
    </section>
  );
}
