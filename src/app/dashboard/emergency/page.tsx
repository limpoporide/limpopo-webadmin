'use client';

import { AlertTriangle, Wrench, Shield, Clock, PhoneCall, Ban, DollarSign, Zap, Key, Heart, Phone } from 'lucide-react';

const emergencyCards = [
  {
    icon: Wrench,
    title: 'Vehicle Break-down',
    description: 'In the case of vehicle breakdown reported by the customer or driver: First, identify the vehicle type from the vehicle list and the assigned driver. Communicate the clear situation report to the manager. If not clear of the situation, verify the vehicle state.',
    color: 'orange',
  },
  {
    icon: Shield,
    title: 'Vehicle Theft',
    description: 'Immediately contact local authorities and file a police report. Document all available information including last known location, driver details, and passenger information. Alert the security team and initiate vehicle tracking protocols.',
    color: 'red',
  },
  {
    icon: Clock,
    title: 'Customer Delay / Assault',
    description: 'Ensure customer safety is the priority. Contact emergency services if required. Document the incident thoroughly. Provide customer support and arrange alternative transportation. Escalate to management immediately.',
    color: 'purple',
  },
  {
    icon: Ban,
    title: 'No Booking Vehicle',
    description: 'Check vehicle availability in the system. Verify driver assignments and locations. Contact nearby drivers for immediate dispatch. Offer customer alternatives or reschedule. Update fleet management on vehicle status.',
    color: 'blue',
  },
  {
    icon: PhoneCall,
    title: 'Destination Not in Coverage',
    description: 'Politely inform the customer about service area limitations. Offer alternative drop-off points within coverage. Suggest partner services for extended routes. Update customer records and service area documentation.',
    color: 'yellow',
  },
  {
    icon: DollarSign,
    title: 'Failed Transaction',
    description: 'Verify transaction details in the payment system. Check customer payment method and account status. Retry transaction or offer alternative payment options. Document the failure and escalate to finance team if unresolved.',
    color: 'green',
  },
  {
    icon: Zap,
    title: 'System Glitch or Failure',
    description: 'Immediately notify IT support team. Document error messages and affected systems. Switch to backup systems if available. Keep customers informed of status. Log incident for root cause analysis.',
    color: 'indigo',
  },
  {
    icon: Key,
    title: 'Security Breach / Password Exposed',
    description: 'CRITICAL: Immediately force password reset for affected accounts. Disable compromised credentials. Notify security team and begin incident investigation. Alert affected users. Review access logs for unauthorized activity.',
    color: 'red',
  },
  {
    icon: Heart,
    title: 'Life / Health Emergency',
    description: 'CRITICAL: Call emergency services (ambulance) immediately. Provide first aid if trained. Keep the person comfortable and calm. Document the emergency. Notify next of kin if information is available. File incident report.',
    color: 'pink',
  },
];

const emergencyContacts = [
  { type: 'Security Breach', number: '+234-800-SECURITY (733-8749)' },
  { type: 'Vehicle Break-Down', number: '+234-800-ROADSIDE (762-3743)' },
  { type: 'Theft / Assault / Abuse', number: '+234-800-HELPNOW (435-7669)' },
  { type: 'Medical Emergency', number: '+234-800-MEDICAL (633-4225)' },
  { type: 'General Emergency', number: '+234-800-LIMPOPO (546-7676)' },
];

const getColorClasses = (color: string) => {
  const colors: { [key: string]: string } = {
    orange: 'from-orange-50 to-orange-100 dark:from-orange-950/20 dark:to-orange-900/20 border-orange-200 dark:border-orange-900/40 text-orange-600 dark:text-orange-400',
    red: 'from-red-50 to-red-100 dark:from-red-950/20 dark:to-red-900/20 border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400',
    purple: 'from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20 border-purple-200 dark:border-purple-900/40 text-purple-600 dark:text-purple-400',
    blue: 'from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 border-blue-200 dark:border-blue-900/40 text-blue-600 dark:text-blue-400',
    yellow: 'from-yellow-50 to-yellow-100 dark:from-yellow-950/20 dark:to-yellow-900/20 border-yellow-200 dark:border-yellow-900/40 text-yellow-600 dark:text-yellow-400',
    green: 'from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20 border-green-200 dark:border-green-900/40 text-green-600 dark:text-green-400',
    indigo: 'from-indigo-50 to-indigo-100 dark:from-indigo-950/20 dark:to-indigo-900/20 border-indigo-200 dark:border-indigo-900/40 text-indigo-600 dark:text-indigo-400',
    pink: 'from-pink-50 to-pink-100 dark:from-pink-950/20 dark:to-pink-900/20 border-pink-200 dark:border-pink-900/40 text-pink-600 dark:text-pink-400',
  };
  return colors[color] || colors.blue;
};

export default function EmergencyPage() {
  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Hero Banner */}
        <div className="bg-gradient-to-r from-red-600 to-orange-600 dark:from-red-700 dark:to-orange-700 rounded-2xl p-8 md:p-12 mb-8 text-white shadow-xl">
          <div className="flex items-center gap-4 mb-4">
            <AlertTriangle size={48} className="animate-pulse" />
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">Limpopo Emergency Playbook</h1>
              <p className="text-red-100 text-sm md:text-base">Quick response guidelines for critical situations</p>
            </div>
          </div>
        </div>

        {/* Emergency Cards */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Emergency Scenarios & Protocols</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {emergencyCards.map((card, index) => {
              const Icon = card.icon;
              return (
                <div
                  key={index}
                  className={`bg-gradient-to-br ${getColorClasses(card.color)} rounded-xl p-6 border`}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <Icon size={32} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                        {card.title}
                      </h3>
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                        {card.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Emergency Contacts */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6">
            <Phone size={24} className="text-red-600 dark:text-red-400" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Emergency Contact Numbers</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {emergencyContacts.map((contact, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600"
              >
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{contact.type}</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">{contact.number}</p>
                </div>
                <PhoneCall size={24} className="text-red-600 dark:text-red-400" />
              </div>
            ))}
          </div>
          <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-900/40">
            <p className="text-sm text-red-700 dark:text-red-400 font-medium">
              ⚠️ For life-threatening emergencies, always call local emergency services (911 or local equivalent) first.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
