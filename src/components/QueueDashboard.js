import React, { useState, useEffect } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import './QueueDashboard.css';

const socket = io.connect("https://queue-442706.de.r.appspot.com");

const QueueDashboard = () => {
  const [queues, setQueues] = useState([]);

  const fetchQueues = async () => {
    try {
      const res = await axios.get('https://queue-442706.de.r.appspot.com/queues');
      const groupedQueues = res.data.reduce((acc, queue) => {
        if (!acc[queue.section]) acc[queue.section] = [];
        acc[queue.section].push(queue);
        return acc;
      }, {});

      const formattedQueues = Object.entries(groupedQueues).map(([section, customers]) => ({
        section,
        customers: customers.slice(0, 6),
      }));

      setQueues(formattedQueues);
    } catch (err) {
      console.error('Error fetching queues:', err);
    }
  };

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
        const res = await axios.get('https://queue-442706.de.r.appspot.com/queues');
        const groupedQueues = res.data.reduce((acc, queue) => {
          if (!acc[queue.section]) acc[queue.section] = [];
          acc[queue.section].push(queue);
          return acc;
        }, {});

        const formattedQueues = Object.entries(groupedQueues).map(([section, customers]) => ({
          section,
          customers: customers.slice(0, 7),
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
