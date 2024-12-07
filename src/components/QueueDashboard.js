import React, { useState, useEffect } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import './QueueDashboard.css';

// Update socket connection to Koyeb app link
const socket = io.connect("https://visiting-gilda-sliitq-471f8cef.koyeb.app");

const QueueDashboard = () => {
  const [queues, setQueues] = useState([]);

  // Function to fetch the queues from Koyeb app
  const fetchQueues = async () => {
    try {
      const res = await axios.get('https://visiting-gilda-sliitq-471f8cef.koyeb.app/queues');
      const groupedQueues = res.data.reduce((acc, queue) => {
        if (!acc[queue.section]) acc[queue.section] = [];
        acc[queue.section].push(queue);
        return acc;
      }, {});

      const formattedQueues = Object.entries(groupedQueues).map(([section, customers]) => ({
        section,
        customers: customers.slice(0, 6), // Limit to the first 6 customers
      }));

      setQueues(formattedQueues);
    } catch (err) {
      console.error('Error fetching queues:', err);
    }
  };

  // UseEffect hook to fetch queues initially and on socket event
  useEffect(() => {
    fetchQueues();
  }, []);

  useEffect(() => {
    socket.on('queue-updated', async (updatedSection) => {
      console.log('Queue updated for section:', updatedSection);

      setQueues((prevQueues) =>
        prevQueues.map((sectionQueue) => {
          if (sectionQueue.section === updatedSection) {
            console.log('Applying fadeOut to:', sectionQueue.customers[0]);
            const updatedCustomers = sectionQueue.customers.map((customer, index) =>
              index === 0 ? { ...customer, fadeOut: true } : customer
            );
            return { ...sectionQueue, customers: updatedCustomers };
          }
          return sectionQueue;
        })
      );

      setTimeout(async () => {
        // Re-fetch queues after fade-out animation
        const res = await axios.get('https://visiting-gilda-sliitq-471f8cef.koyeb.app/queues');
        const groupedQueues = res.data.reduce((acc, queue) => {
          if (!acc[queue.section]) acc[queue.section] = [];
          acc[queue.section].push(queue);
          return acc;
        }, {});

        const formattedQueues = Object.entries(groupedQueues).map(([section, customers]) => ({
          section,
          customers: customers.slice(0, 7), // Limit to the first 7 customers
        }));

        setQueues(formattedQueues);
      }, 500); // Ensure delay matches animation duration
    });

    return () => socket.off('queue-updated');
  }, []);

  return (
    <div className="container">
      <h1 className="header">Queue Dashboard</h1>
      <div className="sections">
        {queues.map((sectionQueue) => (
          <div key={sectionQueue.section} className="section">
            <h2 className="sectionTitle">{sectionQueue.section} </h2>
            <ul>
              {sectionQueue.customers.length > 0 ? (
                sectionQueue.customers.map((customer, index) => (
                  <li
                    key={customer._id}
                    className={`customerItem ${index === 0 ? 'serving' : ''} ${customer.fadeOut ? 'fadeOut' : ''}`}
                  >
                    {/* Display "Serving" for the first item */}
                    {index === 0 ? '(Serving)' : `${index + 1}.`} {customer.membershipNumber}
                  </li>
                ))
              ) : (
                <li>No customers in queue</li>
              )}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};

export default QueueDashboard;
