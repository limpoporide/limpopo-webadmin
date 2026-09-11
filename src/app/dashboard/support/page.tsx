'use client';

import { useEffect, useState } from 'react';
import { Headphones, Ticket, CheckCircle, AlertCircle, X, Send, Mail, Phone } from 'lucide-react';
import TablePagination from '@/components/TablePagination';
import { notify } from '@/lib/notify';

type TicketStatus = 'open' | 'resolved' | 'dispute';

type Ticket = {
  id: number;
  ticketId: string;
  customerName: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  status: TicketStatus;
  date: string;
  response?: string;
};

const sampleTickets: Ticket[] = [
  {
    id: 1,
    ticketId: 'TKT-001234',
    customerName: 'John Doe',
    email: 'john.doe@example.com',
    phone: '08012345678',
    subject: 'Payment Issue',
    message: 'My payment was deducted but the booking was not confirmed. Please help.',
    status: 'open',
    date: '2026-08-19',
  },
  {
    id: 2,
    ticketId: 'TKT-001235',
    customerName: 'Jane Smith',
    email: 'jane.smith@example.com',
    phone: '08098765432',
    subject: 'Driver Complaint',
    message: 'The driver was rude and unprofessional during my trip.',
    status: 'dispute',
    date: '2026-08-18',
  },
  {
    id: 3,
    ticketId: 'TKT-001236',
    customerName: 'Ahmed Ibrahim',
    email: 'ahmed.ibrahim@example.com',
    phone: '08123456789',
    subject: 'Refund Request',
    message: 'I need a refund for my cancelled booking. Transaction ID: TXN001236',
    status: 'resolved',
    date: '2026-08-17',
    response: 'Your refund has been processed and will reflect in your account within 3-5 business days.',
  },
  {
    id: 4,
    ticketId: 'TKT-001237',
    customerName: 'Chioma Nwosu',
    email: 'chioma.nwosu@example.com',
    phone: '08011223344',
    subject: 'Vehicle Not Available',
    message: 'I booked a vehicle but was told none was available. Very disappointing.',
    status: 'open',
    date: '2026-08-19',
  },
];

const TICKETS_PAGE_SIZE = 10;

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>(sampleTickets);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [response, setResponse] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [tickets.length]);

  const pageStartIndex = (currentPage - 1) * TICKETS_PAGE_SIZE;
  const paginatedTickets = tickets.slice(
    pageStartIndex,
    pageStartIndex + TICKETS_PAGE_SIZE,
  );

  const openTickets = tickets.filter(t => t.status === 'open').length;
  const resolvedTickets = tickets.filter(t => t.status === 'resolved').length;
  const disputeTickets = tickets.filter(t => t.status === 'dispute').length;

  const handleViewTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setResponse(ticket.response || '');
    setShowModal(true);
  };

  const handleSendResponse = () => {
    if (!response.trim() || !selectedTicket) {
      notify.error('Please enter a response');
      return;
    }
    
    setTickets(tickets.map(t => 
      t.id === selectedTicket.id 
        ? { ...t, response, status: 'resolved' }
        : t
    ));
    
    notify.success('Response sent successfully');
    setShowModal(false);
    setSelectedTicket(null);
    setResponse('');
  };

  const getStatusBadge = (status: TicketStatus) => {
    switch (status) {
      case 'open':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400">Open</span>;
      case 'resolved':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">Resolved</span>;
      case 'dispute':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">Dispute</span>;
      default:
        return null;
    }
  };

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Headphones size={28} className="text-blue-600 dark:text-blue-400" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Support Center
          </h1>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950/20 dark:to-yellow-900/20 rounded-xl p-6 border border-yellow-200 dark:border-yellow-900/40">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-yellow-700 dark:text-yellow-400">Recent Tickets</h3>
              <Ticket size={20} className="text-yellow-600 dark:text-yellow-400" />
            </div>
            <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-300">{openTickets}</p>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/20 rounded-xl p-6 border border-green-200 dark:border-green-900/40">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-green-700 dark:text-green-400">Resolved Tickets</h3>
              <CheckCircle size={20} className="text-green-600 dark:text-green-400" />
            </div>
            <p className="text-2xl font-bold text-green-900 dark:text-green-300">{resolvedTickets}</p>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/20 dark:to-red-900/20 rounded-xl p-6 border border-red-200 dark:border-red-900/40">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-red-700 dark:text-red-400">Dispute Tickets</h3>
              <AlertCircle size={20} className="text-red-600 dark:text-red-400" />
            </div>
            <p className="text-2xl font-bold text-red-900 dark:text-red-300">{disputeTickets}</p>
          </div>
        </div>

        {/* Tickets Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Support Tickets</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">SN</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Ticket ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Contact</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Subject</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {paginatedTickets.map((ticket, index) => (
                  <tr key={ticket.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition">
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{pageStartIndex + index + 1}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap">{ticket.ticketId}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white whitespace-nowrap">{ticket.date}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{ticket.customerName}</td>
                    <td className="px-4 py-3 text-sm">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                          <Mail size={12} />
                          <span className="text-xs">{ticket.email}</span>
                        </div>
                        <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                          <Phone size={12} />
                          <span className="text-xs">{ticket.phone}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      <div className="max-w-[200px] truncate" title={ticket.subject}>
                        {ticket.subject}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">{getStatusBadge(ticket.status)}</td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      <button
                        onClick={() => handleViewTicket(ticket)}
                        className="px-3 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition"
                      >
                        Respond
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <TablePagination
            currentPage={currentPage}
            pageSize={TICKETS_PAGE_SIZE}
            totalItems={tickets.length}
            itemLabel="tickets"
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      {/* Ticket Response Modal */}
      {showModal && selectedTicket && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Ticket Details</h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              >
                <X size={24} className="text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Ticket Info */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Ticket ID</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedTicket.ticketId}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Date</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedTicket.date}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Customer</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedTicket.customerName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Status</p>
                    {getStatusBadge(selectedTicket.status)}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Mail size={14} className="text-gray-600 dark:text-gray-400" />
                    <a href={`mailto:${selectedTicket.email}`} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                      {selectedTicket.email}
                    </a>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone size={14} className="text-gray-600 dark:text-gray-400" />
                    <a href={`tel:${selectedTicket.phone}`} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                      {selectedTicket.phone}
                    </a>
                  </div>
                </div>
              </div>

              {/* Customer Message */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Subject</h3>
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-3">{selectedTicket.subject}</p>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Customer Message</h3>
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/40 rounded-lg p-4">
                  <p className="text-sm text-gray-700 dark:text-gray-300">{selectedTicket.message}</p>
                </div>
              </div>

              {/* Response Section */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Your Response</h3>
                <textarea
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  placeholder="Type your response to the customer..."
                  rows={6}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleSendResponse}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition"
                >
                  <Send size={16} />
                  Send Response & Resolve
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
