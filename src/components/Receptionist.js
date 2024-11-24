import React, { useState, useEffect } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import './Receptionist.css'; // Add this line to import the CSS

// Connect to the socket server
const socket = io.connect('http://localhost:5000');

const Receptionist = () => {
  const [membershipNumber, setMembershipNumber] = useState('');
  const [section, setSection] = useState('');
  const [sections, setSections] = useState([]);
  const [queues, setQueues] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [pagination, setPagination] = useState({});

  useEffect(() => {
    const fetchSections = async () => {
      try {
        const res = await axios.get('http://localhost:5000/sections');
        setSections(res.data);
      } catch (err) {
        console.error('Error fetching sections:', err);
        setError('Failed to load sections. Please try again.');
      }
    };
    fetchSections();
    fetchQueues();
  }, []);

  const fetchQueues = async () => {
    try {
      const res = await axios.get('http://localhost:5000/queues');
      const groupedQueues = res.data.reduce((acc, queue) => {
        if (!acc[queue.section]) acc[queue.section] = [];
        acc[queue.section].push(queue);
        return acc;
      }, {});

      const formattedQueues = Object.entries(groupedQueues).map(([section, customers]) => ({
        section,
        customers,
      }));

      setQueues(formattedQueues);
      // Initialize pagination for each section
      const initialPagination = formattedQueues.reduce((acc, group) => {
        acc[group.section] = 1; // Start from page 1 for each section
        return acc;
      }, {});
      setPagination(initialPagination);
    } catch (err) {
      console.error('Error fetching queues:', err);
      setError('Failed to load queues. Please try again.');
    }
  };

  useEffect(() => {
    socket.on('queue-updated', () => {
      fetchQueues();
    });
    return () => socket.off('queue-updated');
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!membershipNumber || !section) {
      setError('Please enter a membership number and select a section.');
      return;
    }
    try {
      await axios.post('http://localhost:5000/queue', { membershipNumber, section });
      setMembershipNumber('');
      setSection('');
      setSuccess('Customer added to queue successfully!');
      fetchQueues();

      // Hide success message after 2 seconds
      setTimeout(() => {
        setSuccess('');
      }, 2000);
    } catch (err) {
      console.error('Error adding to queue:', err);
      setError('Failed to add customer to queue. Please try again.');
    }
  };

  const handlePagination = (section, direction) => {
    setPagination((prevPagination) => {
      const currentPage = prevPagination[section] || 1;
      const nextPage = direction === 'next' ? currentPage + 1 : currentPage - 1;
      return {
        ...prevPagination,
        [section]: nextPage,
      };
    });
  };

  // Helper function to get the current section's queues for the current page
  const getPageQueues = (section) => {
    const currentPage = pagination[section] || 1;
    const startIndex = (currentPage - 1) * 7;
    const endIndex = startIndex + 7;
    return queues.find(queue => queue.section === section)?.customers.slice(startIndex, endIndex);
  };

  return (
    <div className="admin-container">
      <h1>Receptionist Panel</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Enter Membership Number"
          value={membershipNumber}
          onChange={(e) => setMembershipNumber(e.target.value)}
        />
        <select
          value={section}
          onChange={(e) => setSection(e.target.value)}
        >
          <option value="">Select Section</option>
          {sections.map((sec) => (
            <option key={sec._id} value={sec.name}>
              {sec.name}
            </option>
          ))}
        </select>
        <button type="submit">Add to Queue</button>
      </form>

      {success && <p className="success">{success}</p>}
      {error && <p className="error">{error}</p>}

      <h2>All Queues</h2>
      <div className="queues-container">
        {queues.length > 0 ? (
          queues.map((queueGroup) => {
            const customersForPage = getPageQueues(queueGroup.section);
            const currentPage = pagination[queueGroup.section] || 1;
            const totalCustomers = queueGroup.customers.length;
            const hasMoreCustomers = currentPage * 7 < totalCustomers;

            const showNextButton = hasMoreCustomers;
            const showPrevButton = currentPage > 1;

            return (
              <div key={queueGroup.section} className="queue-group">
                <h3 style={{ color: 'black' }}>{queueGroup.section}</h3>
                <ul>
                  {customersForPage.length > 0 ? (
                    customersForPage.map((item) => (
                      <li key={item._id}>
                        {item.membershipNumber} (Position: {item.position})
                      </li>
                    ))
                  ) : (
                    <li>No customers in queue</li>
                  )}
                </ul>
                <div className="pagination-controls">
                  {showPrevButton && (
                    <button
                      onClick={() => handlePagination(queueGroup.section, 'prev')}
                    >
                      Previous
                    </button>
                  )}
                  <span> {currentPage}</span>
                  {showNextButton && (
                    <button
                      onClick={() => handlePagination(queueGroup.section, 'next')}
                    >
                      Next
                    </button>
                  )}
                </div>
                <hr />
              </div>
            );
          })
        ) : (
          <p>No queues available.</p>
        )}
      </div>
    </div>
  );
};

export default Receptionist;
