'use client';

import Image from 'next/image';
import { useState } from 'react';
import { MapPin, User, Car, CreditCard } from 'lucide-react';

type BookingType = 'Airport Pickup' | 'Open Pickup' | 'Hiring';
type VehicleType = 'Limpopo Pro' | 'Limpopo Pro-Max (SUV)';

export default function BookingPage() {
  const [bookingType, setBookingType] = useState<BookingType>('Airport Pickup');
  const [location, setLocation] = useState('Lagos MM1');
  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState('male');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [onWhatsApp, setOnWhatsApp] = useState(false);
  const [state, setState] = useState('Lagos');
  
  const [vehicleType, setVehicleType] = useState<VehicleType>('Limpopo Pro');
  const [formError, setFormError] = useState('');
  
  // Sample calculation values
  const estimatedKM = '25';
  const eta = '45 mins';
  const amount = vehicleType === 'Limpopo Pro' ? '₦8,500' : '₦12,000';

  const handleProceedToPay = () => {
    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();

    if (bookingType !== 'Open Pickup' && (!pickup.trim() || !dropoff.trim())) {
      setFormError('Please complete the trip locations before proceeding.');
      return;
    }

    if (trimmedFirstName.length < 3) {
      setFormError('Please enter a valid first name to continue.');
      return;
    }

    if (trimmedLastName.length < 3) {
      setFormError('Please enter a valid last name to continue.');
      return;
    }

    if (!trimmedEmail.includes('@')) {
      setFormError('Please enter a valid email address to continue.');
      return;
    }

    if (!trimmedPhone || !/^\d+$/.test(trimmedPhone)) {
      setFormError('Please enter a valid phone number to continue.');
      return;
    }

    if (!state) {
      setFormError('Please select a state to continue.');
      return;
    }

    setFormError('');
    // Handle payment logic
    console.log('Proceed to payment');
  };

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 overflow-hidden">
              <Image
                src="/location.png"
                alt="Location"
                fill
                sizes="40px"
                className="object-contain"
                priority
              />
            </div>
            <h1 className="text-2xl md:text-2xl font-bold text-gray-900 dark:text-white">
              New Booking
            </h1>
          </div>
        </div>

        <div className="space-y-6">
          {/* Section 1: Booking Type */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Booking Type
            </h2>
            <div className="flex flex-col sm:flex-row gap-4">
              {(['Airport Pickup', 'Open Pickup', 'Hiring'] as BookingType[]).map((type) => (
                <label
                  key={type}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 cursor-pointer transition ${
                    bookingType === type
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-blue-400'
                  }`}
                >
                  <input
                    type="radio"
                    name="bookingType"
                    value={type}
                    checked={bookingType === type}
                    onChange={(e) => setBookingType(e.target.value as BookingType)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="font-medium text-gray-900 dark:text-white">{type}</span>
                </label>
              ))}
            </div>

            <div
              className={`mt-6 grid grid-cols-1 gap-4 ${
                bookingType === 'Open Pickup' ? 'md:grid-cols-2' : 'md:grid-cols-3'
              }`}
            >
              {bookingType !== 'Open Pickup' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Location
                  </label>
                  <select
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  >
                    <option value="Lagos MM1">Lagos MM1</option>
                    <option value="Lagos MM2">Lagos MM2</option>
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Pick Up
                </label>
                <input
                  type="text"
                  value={pickup}
                  onChange={(e) => {
                    setPickup(e.target.value);
                    if (formError) {
                      setFormError('');
                    }
                  }}
                  placeholder="Enter pick up location"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Drop Off
                </label>
                <input
                  type="text"
                  value={dropoff}
                  onChange={(e) => {
                    setDropoff(e.target.value);
                    if (formError) {
                      setFormError('');
                    }
                  }}
                  placeholder="Enter drop off location"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  required
                />
              </div>
            </div>
          </div>

          {/* Section 2: Customer Details */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-2 mb-4">
              <User size={20} className="text-blue-600 dark:text-blue-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Customer Details
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  First Name
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => {
                    setFirstName(e.target.value);
                    if (formError) {
                      setFormError('');
                    }
                  }}
                  placeholder="Enter first name"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Last Name
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => {
                    setLastName(e.target.value);
                    if (formError) {
                      setFormError('');
                    }
                  }}
                  placeholder="Enter last name"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Gender
                </label>
                <select
                  value={gender}
                  onChange={(e) => {
                    setGender(e.target.value);
                    if (formError) {
                      setFormError('');
                    }
                  }}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  required
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (formError) {
                      setFormError('');
                    }
                  }}
                  placeholder="Enter email address"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value.replace(/\D/g, ''));
                    if (formError) {
                      setFormError('');
                    }
                  }}
                  placeholder="Enter phone number"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  inputMode="numeric"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  State
                </label>
                <select
                  value={state}
                  onChange={(e) => {
                    setState(e.target.value);
                    if (formError) {
                      setFormError('');
                    }
                  }}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  required
                >
                  <option value="Lagos">Lagos</option>
                  <option value="Abuja">Abuja</option>
                  <option value="Port Harcourt">Port Harcourt</option>
                  <option value="Kano">Kano</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={onWhatsApp}
                    onChange={(e) => setOnWhatsApp(e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    On WhatsApp
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Section 3: Vehicle Type */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Car size={20} className="text-blue-600 dark:text-blue-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Vehicle Type
              </h2>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              {(['Limpopo Pro', 'Limpopo Pro-Max (SUV)'] as VehicleType[]).map((type) => (
                <label
                  key={type}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 cursor-pointer transition flex-1 ${
                    vehicleType === type
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-blue-400'
                  }`}
                >
                  <input
                    type="radio"
                    name="vehicleType"
                    value={type}
                    checked={vehicleType === type}
                    onChange={(e) => setVehicleType(e.target.value as VehicleType)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="font-medium text-gray-900 dark:text-white">{type}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Section 4: Destination and Financial Summary */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard size={20} className="text-blue-600 dark:text-blue-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Destination & Financial Summary
              </h2>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Pick Up</p>
                  <p className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <MapPin size={16} className="text-green-600" />
                    {pickup || 'Not specified'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Drop Off</p>
                  <p className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <MapPin size={16} className="text-red-600" />
                    {dropoff || 'Not specified'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Vehicle Type</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{vehicleType}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Estimated KM</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{estimatedKM} km</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Estimated Time</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{eta}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Amount</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{amount}</p>
                </div>
              </div>

              {formError && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                  {formError}
                </div>
              )}
              
              <button
                onClick={handleProceedToPay}
                className="w-full md:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition duration-200 transform hover:scale-[1.02]"
              >
                Proceed to Pay
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
