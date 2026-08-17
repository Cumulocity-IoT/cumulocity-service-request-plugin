describe('Service Requests Plugin', () => {
  const deviceId = Cypress.env('C8Y_DEVICE_ID');

  before(() => {
    Cypress.session.clearAllSavedSessions();
  });

  beforeEach(() => {
    cy.getAuth().login().disableGainsight();
  });

  describe('Service requests overview', () => {
    it('should load the service requests overview page', () => {
      cy.visitShellAndWaitForSelector(
        `device/${deviceId}`,
        'en',
        'c8y-tabs-outlet'
      );

      cy.get(
        'c8y-tabs-outlet div[role="listitem"] span[title="Service Requests"]'
      )
        .should('exist')
        .should('be.visible')

      cy.get(
        'c8y-dashboard c8y-dashboard-child ene-service-request-list-widget-component-widget'
      )
        .should('exist')
        .should('be.visible');
    });

    it('should display the correct widgets on service requests dashboard', () => {
      cy.visitShellAndWaitForSelector(
        `device/${deviceId}/service-requests`,
        'en',
        'c8y-dashboard ene-service-request-list-widget-component-widget'
      );

      // Check if alarm list widget is present
      cy.get(
        'c8y-dashboard c8y-dashboard-child [data-cy="alarm-list-widget-component"]'
      )
        .should('exist')
        .should('be.visible');

      // Check if service request list widget is present
      cy.get(
        'c8y-dashboard c8y-dashboard-child ene-service-request-list-widget-component-widget',
        { timeout: 30000 }
      )
        .should('exist')
        .should('be.visible');
    });
  });

  describe('Alarm List Widget', () => {
    const mockAlarms = [
      {
        id: '1001',
        type: 'c8y_TemperatureAlarm',
        severity: 'CRITICAL',
        status: 'ACTIVE',
        text: 'High temperature detected',
        time: '2025-12-22T10:00:00.000Z',
        creationTime: '2025-12-22T10:00:00.000Z',
        lastUpdated: '2025-12-22T10:00:00.000Z',
        count: 3,
        source: {
          id: deviceId,
          name: 'Test Device',
          self: `https://example.cumulocity.com/inventory/managedObjects/${deviceId}`,
        },
        self: 'https://example.cumulocity.com/alarm/alarms/1001',
      },
      {
        id: '1002',
        type: 'c8y_VibrationAlarm',
        severity: 'MAJOR',
        status: 'ACTIVE',
        text: 'Vibration threshold exceeded',
        time: '2025-12-22T09:30:00.000Z',
        creationTime: '2025-12-22T09:30:00.000Z',
        lastUpdated: '2025-12-22T09:30:00.000Z',
        count: 1,
        source: {
          id: deviceId,
          name: 'Test Device',
          self: `https://example.cumulocity.com/inventory/managedObjects/${deviceId}`,
        },
        self: 'https://example.cumulocity.com/alarm/alarms/1002',
      },
      {
        id: '1003',
        type: 'c8y_UnavailabilityAlarm',
        severity: 'WARNING',
        status: 'ACKNOWLEDGED',
        text: 'Device not responding',
        time: '2025-12-22T09:00:00.000Z',
        creationTime: '2025-12-22T09:00:00.000Z',
        lastUpdated: '2025-12-22T09:15:00.000Z',
        count: 1,
        source: {
          id: deviceId,
          name: 'Test Device',
          self: `https://example.cumulocity.com/inventory/managedObjects/${deviceId}`,
        },
        self: 'https://example.cumulocity.com/alarm/alarms/1003',
      },
    ];

    const mockAlarmsResponse = {
      alarms: mockAlarms,
      statistics: {
        currentPage: 1,
        pageSize: 20,
        totalPages: 1,
      },
      self: 'https://example.cumulocity.com/alarm/alarms',
    };

    beforeEach(() => {
      // Intercept alarm list requests
      cy.intercept('GET', '**/alarm/alarms*', (req) => {
        req.reply({
          statusCode: 200,
          body: mockAlarmsResponse,
        });
      }).as('getAlarms');
    });

    it('should display the alarm list widget', () => {
      cy.visitShellAndWaitForSelector(
        `device/${deviceId}/service-requests`,
        'en',
        'c8y-dashboard ene-service-request-list-widget-component-widget'
      );

      cy.get('[data-cy="alarm-list-widget-component"]')
        .should('exist')
        .should('be.visible');
    });

    it('should load and display alarms', () => {
      cy.visitShellAndWaitForSelector(
        `device/${deviceId}/service-requests`,
        'en',
        'c8y-dashboard'
      );

      cy.wait('@getAlarms');

      // Check that alarms are displayed
      cy.get('[data-cy="alarm-list-widget-component"]').within(() => {
        cy.get('.list-group-item').should('have.length', 3);
        cy.contains('High temperature detected').should('be.visible');
        cy.contains('Vibration threshold exceeded').should('be.visible');
        cy.contains('Device not responding').should('be.visible');
      });
    });

    it('should display alarm icons with correct severity and status', () => {
      cy.visitShellAndWaitForSelector(
        `device/${deviceId}/service-requests`,
        'en',
        'c8y-dashboard'
      );

      cy.wait('@getAlarms');

      cy.get('[data-cy="alarm-list-widget-component"]').within(() => {
        // Check for severity icons
        cy.get('sr-alarm-icon.severity').should('have.length', 3);
        // Check for status icons
        cy.get('sr-alarm-icon.status').should('have.length', 3);
      });
    });

    it('should display alarm count badge when count > 1', () => {
      cy.visitShellAndWaitForSelector(
        `device/${deviceId}/service-requests`,
        'en',
        'c8y-dashboard'
      );

      cy.wait('@getAlarms');

      cy.get('[data-cy="alarm-list-widget-component"]').within(() => {
        // First alarm has count of 3
        cy.contains('High temperature detected')
          .parent()
          .within(() => {
            cy.get('.badge.badge-danger').should('contain', '3');
          });
      });
    });

    it('should filter alarms by status', () => {
      const filteredResponse = {
        ...mockAlarmsResponse,
        alarms: mockAlarms.filter((alarm) => alarm.status === 'ACTIVE'),
      };

      cy.intercept('GET', '**/alarm/alarms*status=ACTIVE&*', {
        statusCode: 200,
        body: filteredResponse,
      }).as('getFilteredAlarms');

      cy.visitShellAndWaitForSelector(
        `device/${deviceId}/service-requests`,
        'en',
        'c8y-dashboard'
      );

      cy.wait('@getAlarms');

      cy.get(
        '[data-cy="alarm-list-status-filter"] [data-cy="select-button"]'
      ).click();

      cy.get('div.dropdown c8y-list-group')
        .should('exist')
        .within(() => {
          cy.contains('ACKNOWLEDGED').click();
        });

      cy.wait('@getFilteredAlarms');
    });

    it('should filter alarms by severity', () => {
      const filteredResponse = {
        ...mockAlarmsResponse,
        alarms: mockAlarms.filter((alarm) => alarm.severity === 'CRITICAL'),
      };

      cy.intercept('GET', '**/alarm/alarms*severity=CRITICAL&*', {
        statusCode: 200,
        body: filteredResponse,
      }).as('getFilteredAlarms');

      cy.visitShellAndWaitForSelector(
        `device/${deviceId}/service-requests`,
        'en',
        'c8y-dashboard'
      );

      //   cy.wait('@getAlarms');

      // Open severity dropdown and select CRITICAL
      cy.get(
        '[data-cy="alarm-list-severity-filter"] [data-cy="select-button"]'
      ).click();

      cy.get('div.dropdown c8y-list-group')
        .should('exist')
        .within(() => {
          cy.contains('MAJOR').click();
          cy.contains('MINOR').click();
        });

      cy.wait('@getFilteredAlarms');
    });

    it('should reload alarms when reload button is clicked', () => {
      cy.visitShellAndWaitForSelector(
        `device/${deviceId}/service-requests`,
        'en',
        'c8y-dashboard'
      );

      cy.wait('@getAlarms');

      cy.get('[data-cy="alarm-list-widget-component"]').within(() => {
        cy.contains('button', 'Reload').click();
      });

      cy.wait('@getAlarms');
    });

    it('should toggle realtime polling', () => {
      cy.visitShellAndWaitForSelector(
        `device/${deviceId}/service-requests`,
        'en',
        'c8y-dashboard'
      );

      cy.wait('@getAlarms');

      cy.get('[data-cy="alarm-list-widget-component"]').within(() => {
        // Check that polling is enabled by default
        cy.get('.c8y-pulse.active').should('exist');

        // Click to disable polling
        cy.contains('button', 'Realtime').click();

        // Check that polling is disabled
        cy.get('.c8y-pulse.inactive').should('exist');

        // Click to enable polling again
        cy.contains('button', 'Realtime').click();

        // Check that polling is enabled
        cy.get('.c8y-pulse.active').should('exist');
      });
    });

    it('should clear an alarm when clear button is clicked', () => {
      cy.intercept('PUT', '**/alarm/alarms/1001', {
        statusCode: 200,
        body: {
          ...mockAlarms[0],
          status: 'CLEARED',
        },
      }).as('clearAlarm');

      cy.visitShellAndWaitForSelector(
        `device/${deviceId}/service-requests`,
        'en',
        'c8y-dashboard'
      );

      cy.wait('@getAlarms');

      cy.get('[data-cy="alarm-list-widget-component"]').within(() => {
        // Find the first ACTIVE alarm and click clear button
        cy.contains('High temperature detected')
          .closest('.list-group-item')
          .within(() => {
            cy.get('[data-cy="alarm-list-clear-alarm-button"]').click();
          });
      });

      cy.wait('@clearAlarm');
      cy.wait('@getAlarms'); // Should reload after clearing
    });

    it('should open service request modal for ACTIVE alarms', () => {
      cy.visitShellAndWaitForSelector(
        `device/${deviceId}/service-requests`,
        'en',
        'c8y-dashboard'
      );

      cy.wait('@getAlarms');

      cy.get('[data-cy="alarm-list-widget-component"]').within(() => {
        // Find an ACTIVE alarm and click the service request button
        cy.contains('High temperature detected')
          .closest('.list-group-item')
          .within(() => {
            cy.get('[data-cy="alarm-list-create-service-request-button"]')
              .should('be.visible')
              .click();
          });
      });

      cy.get('[data-cy="service-request-details-modal"]', { timeout: 10000 })
        .should('exist')
        .should('be.visible');
    });

    it('should not show create service request button for non-ACTIVE alarms', () => {
      cy.visitShellAndWaitForSelector(
        `device/${deviceId}/service-requests`,
        'en',
        'c8y-dashboard'
      );

      cy.wait('@getAlarms');

      cy.get('[data-cy="alarm-list-widget-component"]').within(() => {
        // Find the ACKNOWLEDGED alarm
        cy.contains('Device not responding')
          .closest('.list-group-item')
          .within(() => {
            cy.get('a[tooltip="Create service request"]').should('not.exist');
          });
      });
    });

    it('should display empty state when no alarms exist', () => {
      const emptyResponse = {
        ...mockAlarmsResponse,
        alarms: [],
      };

      cy.intercept('GET', '**/alarm/alarms*', {
        delay: 1500,
        statusCode: 200,
        body: emptyResponse,
      }).as('getEmptyAlarms');

      cy.visitShellAndWaitForSelector(
        `device/${deviceId}/service-requests`,
        'en',
        'c8y-dashboard'
      );

      cy.wait('@getEmptyAlarms');

      cy.get('[data-cy="alarm-list-widget-component"]').within(() => {
        cy.contains('No alarms to display').should('be.visible');
        cy.contains('Check your filter settings').should('be.visible');
      });
    });

    it('should show loading indicator while fetching alarms', () => {
      cy.intercept('GET', '**/alarm/alarms*', (req) => {
        // Delay the response to see loading state
        req.reply((res) => {
          res.delay = 1000;
          res.send({
            statusCode: 200,
            body: mockAlarmsResponse,
          });
        });
      }).as('getAlarmsDelayed');

      cy.visitShellAndWaitForSelector(
        `device/${deviceId}/service-requests`,
        'en',
        'c8y-dashboard'
      );

      cy.get('[data-cy="alarm-list-widget-component"]').within(() => {
        cy.get('c8y-loading').should('be.visible');
      });

      cy.wait('@getAlarmsDelayed');
    });

    it('should display alarm details with timestamps', () => {
      cy.visitShellAndWaitForSelector(
        `device/${deviceId}/service-requests`,
        'en',
        'c8y-dashboard'
      );

      cy.wait('@getAlarms');

      cy.get('[data-cy="alarm-list-widget-component"]').within(() => {
        cy.contains('High temperature detected')
          .closest('.list-group-item')
          .within(() => {
            // Check for timestamp icon
            cy.get('.dlt-c8y-icon-clock-o').should('exist');
            // Check for source device link
            cy.get('.dlt-c8y-icon-exchange').should('exist');
            cy.contains('Test Device').should('be.visible');
          });
      });
    });

    it('should link to device notifications page from alarm source', () => {
      cy.visitShellAndWaitForSelector(
        `device/${deviceId}/service-requests`,
        'en',
        'c8y-dashboard'
      );

      cy.wait('@getAlarms');

      cy.get('[data-cy="alarm-list-widget-component"]').within(() => {
        cy.contains('High temperature detected')
          .closest('.list-group-item')
          .within(() => {
            cy.get(`a[href*="/device/${deviceId}/notifications"]`).should(
              'exist'
            );
          });
      });
    });
  });

  describe('Service Request List Widget', () => {
    const mockServiceRequests = [
      {
        id: 'sr-001',
        title: 'Temperature sensor malfunction',
        description: 'The temperature sensor is reporting incorrect values.',
        status: {
          id: 'open',
          name: 'Open',
        },
        priority: {
          name: 'High',
          ordinal: 3,
        },
        isActive: true,
        creationTime: '2025-12-22T10:00:00.000Z',
        updateTime: '2025-12-22T10:00:00.000Z',
        lastUpdated: '2025-12-22T10:00:00.000Z',
        owner: 'user@example.com',
        type: 'alarm',
        source: {
          id: deviceId,
          name: 'Test Device',
          self: `https://example.cumulocity.com/inventory/managedObjects/${deviceId}`,
        },
        alarmRef: {
          uri: 'https://example.cumulocity.com/alarm/alarms/1001',
          id: '1001',
        },
        attachment: null,
      },
      {
        id: 'sr-002',
        title: 'Vibration alarm follow-up',
        description: 'Follow-up on the vibration alarm from yesterday.',
        status: {
          id: 'in-progress',
          name: 'In Progress',
        },
        priority: {
          name: 'Medium',
          ordinal: 2,
        },
        isActive: true,
        creationTime: '2025-12-21T14:30:00.000Z',
        updateTime: '2025-12-22T09:00:00.000Z',
        lastUpdated: '2025-12-22T09:00:00.000Z',
        owner: 'admin@example.com',
        type: 'alarm',
        source: {
          id: deviceId,
          name: 'Test Device',
          self: `https://example.cumulocity.com/inventory/managedObjects/${deviceId}`,
        },
        alarmRef: {
          uri: 'https://example.cumulocity.com/alarm/alarms/1002',
          id: '1002',
        },
        attachment: null,
      },
      {
        id: 'sr-003',
        title: 'Device maintenance scheduled',
        description: 'Scheduled maintenance for the device.',
        status: {
          id: 'open',
          name: 'Open',
        },
        priority: {
          name: 'Low',
          ordinal: 1,
        },
        isActive: false,
        creationTime: '2025-12-20T08:00:00.000Z',
        updateTime: '2025-12-21T16:00:00.000Z',
        lastUpdated: '2025-12-21T16:00:00.000Z',
        owner: 'technician@example.com',
        type: 'alarm',
        source: {
          id: deviceId,
          name: 'Test Device',
          self: `https://example.cumulocity.com/inventory/managedObjects/${deviceId}`,
        },
        alarmRef: null,
        attachment: null,
      },
      {
        id: 'sr-004',
        title: 'Service Request Closed Example',
        description: 'Service request that is already closed.',
        status: {
          id: '10',
          name: 'Closed',
        },
        priority: {
          name: 'Low',
          ordinal: 3,
        },
        isActive: false,
        creationTime: '2025-12-20T08:00:00.000Z',
        updateTime: '2025-12-21T16:00:00.000Z',
        lastUpdated: '2025-12-21T16:00:00.000Z',
        owner: 'technician@example.com',
        type: 'alarm',
        source: {
          id: deviceId,
          name: 'Test Device',
          self: `https://example.cumulocity.com/inventory/managedObjects/${deviceId}`,
        },
        alarmRef: null,
        attachment: null,
      },
    ];

    const mockServiceRequestsResponse = {
      list: mockServiceRequests,
    };

    const mockComments = [
      {
        id: 'comment-001',
        owner: 'user@example.com',
        creationTime: '2025-12-22T10:05:00.000Z',
        text: 'Initial investigation started.',
        type: 'user',
      },
      {
        id: 'comment-002',
        owner: 'system',
        creationTime: '2025-12-22T10:10:00.000Z',
        text: 'Status changed to Open',
        type: 'system',
      },
      {
        id: 'comment-003',
        owner: 'admin@example.com',
        creationTime: '2025-12-22T10:30:00.000Z',
        text: 'Escalating to technical team.',
        type: 'user',
      },
    ];

    const mockCommentsResponse = {
      list: mockComments,
    };

    beforeEach(() => {
      // service/service-request-mgmt/api/service/request?pageSize=500&sourceId=864216
      // Intercept service request list requests
      cy.intercept(
        'GET',
        '**/service/service-request-mgmt/api/service/request*',
        (req) =>
          req.reply({
            statusCode: 200,
            body: mockServiceRequestsResponse,
          })
      ).as('getServiceRequests');
    });

    it('should display the service request list widget', () => {
      cy.visitShellAndWaitForSelector(
        `device/${deviceId}/service-requests`,
        'en',
        'c8y-dashboard ene-service-request-list-widget-component-widget'
      );

      cy.get('ene-service-request-list-widget-component-widget')
        .should('exist')
        .should('be.visible');
    });

    it('should load and display service requests', () => {
      cy.visitShellAndWaitForSelector(
        `device/${deviceId}/service-requests`,
        'en',
        'c8y-dashboard'
      );

      cy.wait('@getServiceRequests');

      // Check that service requests are displayed
      cy.get('ene-service-request-list-widget-component-widget').within(() => {
        cy.get('.list-group-item').should('have.length', 4);
        cy.contains('Temperature sensor malfunction').should('be.visible');
        cy.contains('Vibration alarm follow-up').should('be.visible');
        cy.contains('Device maintenance scheduled').should('be.visible');
      });
    });

    it('should display service request with correct priority icons', () => {
      cy.visitShellAndWaitForSelector(
        `device/${deviceId}/service-requests`,
        'en',
        'c8y-dashboard'
      );

      cy.wait('@getServiceRequests');

      cy.get('ene-service-request-list-widget-component-widget').within(() => {
        // Check for priority icons
        cy.get('ene-service-request-icon').should('have.length', 4);

        // Check high priority (ordinal 1)
        cy.contains('Temperature sensor malfunction')
          .closest('.list-group-item')
          .within(() => {
            cy.get('.priority-3').should('exist');
          });

        // Check medium priority (ordinal 2)
        cy.contains('Vibration alarm follow-up')
          .closest('.list-group-item')
          .within(() => {
            cy.get('.priority-2').should('exist');
          });

        // Check low priority (ordinal 3)
        cy.contains('Device maintenance scheduled')
          .closest('.list-group-item')
          .within(() => {
            cy.get('.priority-1').should('exist');
          });
      });
    });

    it('should display service request status', () => {
      cy.visitShellAndWaitForSelector(
        `device/${deviceId}/service-requests`,
        'en',
        'c8y-dashboard'
      );

      cy.wait('@getServiceRequests');

      cy.get('ene-service-request-list-widget-component-widget').within(() => {
        // Check for status display
        cy.contains('Temperature sensor malfunction')
          .closest('.list-group-item')
          .within(() => {
            cy.contains('Open').should('be.visible');
          });

        cy.contains('Vibration alarm follow-up')
          .closest('.list-group-item')
          .within(() => {
            cy.contains('In Progress').should('be.visible');
          });

        cy.contains('Service Request Closed Example')
          .closest('.list-group-item')
          .within(() => {
            cy.contains('Closed').should('be.visible');
          });
      });
    });

    it('should display closed service request with correct styling', () => {
      cy.visitShellAndWaitForSelector(
        `device/${deviceId}/service-requests`,
        'en',
        'c8y-dashboard'
      );

      cy.wait('@getServiceRequests');

      cy.get('ene-service-request-list-widget-component-widget').within(() => {
        // Check that closed request has the closed class
        cy.contains('Service Request Closed Example')
          .closest('.list-group-item')
          .within(() => {
            cy.get('header.closed').should('exist');
          });
      });
    });

    it('should display service request timestamps', () => {
      cy.visitShellAndWaitForSelector(
        `device/${deviceId}/service-requests`,
        'en',
        'c8y-dashboard'
      );

      cy.wait('@getServiceRequests');

      cy.get('ene-service-request-list-widget-component-widget').within(() => {
        cy.contains('Temperature sensor malfunction')
          .closest('.list-group-item')
          .within(() => {
            // Check for timestamp icon
            cy.get('.dlt-c8y-icon-clock-o').should('exist');
          });
      });
    });

    it('should link to device page from service request source', () => {
      cy.visitShellAndWaitForSelector(
        `device/${deviceId}/service-requests`,
        'en',
        'c8y-dashboard'
      );

      cy.wait('@getServiceRequests');

      cy.get('ene-service-request-list-widget-component-widget').within(() => {
        cy.contains('Temperature sensor malfunction')
          .closest('.list-group-item')
          .within(() => {
            // Check for device link
            cy.get(`a[href*="/device/${deviceId}"]`).should('exist');
            cy.contains('Test Device').should('be.visible');
          });
      });
    });

    it('should expand service request to show details', () => {
      // Intercept comments request
      cy.intercept(
        'GET',
        '**/service/service-request-mgmt/api/service/request/sr-001/comment*',
        {
          statusCode: 200,
          body: mockCommentsResponse,
        }
      ).as('getComments');

      cy.visitShellAndWaitForSelector(
        `device/${deviceId}/service-requests`,
        'en',
        'c8y-dashboard'
      );

      cy.wait('@getServiceRequests');

      cy.get('ene-service-request-list-widget-component-widget').within(() => {
        cy.contains('Temperature sensor malfunction')
          .closest('.list-group-item')
          .within(() => {
            // Initially collapsed
            cy.get('.collapse').should('not.be.visible');

            // Click to expand
            cy.get('.collapse-btn').click();

            // Wait for expansion
            cy.get('.collapse', { timeout: 2000 }).should('be.visible');

            // Check that description is visible
            cy.contains(
              'The temperature sensor is reporting incorrect values.'
            ).should('be.visible');
          });
      });

      cy.wait('@getComments');
    });

    it('should load and display comments when expanded', () => {
      cy.intercept(
        'GET',
        '**/service/service-request-mgmt/api/service/request/sr-001/comment*',
        {
          statusCode: 200,
          body: mockCommentsResponse,
        }
      ).as('getComments');

      cy.visitShellAndWaitForSelector(
        `device/${deviceId}/service-requests`,
        'en',
        'c8y-dashboard'
      );

      cy.wait('@getServiceRequests');

      cy.get('ene-service-request-list-widget-component-widget').within(() => {
        cy.contains('Temperature sensor malfunction')
          .closest('.list-group-item')
          .within(() => {
            // Expand the service request
            cy.get('.collapse-btn').click();
          });
      });

      cy.wait('@getComments');

      cy.get('ene-service-request-list-widget-component-widget').within(() => {
        cy.contains('Temperature sensor malfunction')
          .closest('.list-group-item')
          .within(() => {
            // Check that comments are displayed
            cy.contains('Initial investigation started.').should('be.visible');
            cy.contains('Status changed to Open').should('be.visible');
            cy.contains('Escalating to technical team.').should('be.visible');
          });
      });
    });

    it('should open service request modal when clicking title', () => {
      cy.visitShellAndWaitForSelector(
        `device/${deviceId}/service-requests`,
        'en',
        'c8y-dashboard'
      );

      cy.wait('@getServiceRequests');

      cy.get('ene-service-request-list-widget-component-widget').within(() => {
        cy.contains('button', 'Temperature sensor malfunction').click();
      });

      cy.get('[data-cy="service-request-details-modal"]', { timeout: 10000 })
        .should('exist')
        .should('be.visible');
    });

    it('should display empty state when no service requests exist', () => {
      const emptyResponse = {
        list: [],
      };

      cy.intercept(
        'GET',
        '**/service/service-request-mgmt/api/service/request*',
        {
          statusCode: 200,
          body: emptyResponse,
          delay: 1000,
        }
      ).as('getEmptyServiceRequests');

      cy.visitShellAndWaitForSelector(
        `device/${deviceId}/service-requests`,
        'en',
        'c8y-dashboard'
      );

      cy.wait('@getEmptyServiceRequests');

      cy.get('ene-service-request-list-widget-component-widget').within(() => {
        cy.contains('No service requests to display.').should('be.visible');
        cy.get('.c8y-icon-data-explorer').should('exist');
      });
    });

    it('should show loading indicator while fetching service requests', () => {
      cy.intercept(
        'GET',
        '**/service/service-request-mgmt/api/service/request*',
        (req) => {
          req.reply((res) => {
            res.delay = 2000;
            res.send({
              statusCode: 200,
              body: mockServiceRequestsResponse,
            });
          });
        }
      ).as('getServiceRequestsDelayed');

      cy.visitShellAndWaitForSelector(
        `device/${deviceId}/service-requests`,
        'en',
        'c8y-dashboard'
      );

      cy.get('ene-service-request-list-widget-component-widget').within(() => {
        cy.get('c8y-loading').should('be.visible');
      });

      cy.wait('@getServiceRequestsDelayed');
    });

    it('should display all priority levels correctly', () => {
      cy.visitShellAndWaitForSelector(
        `device/${deviceId}/service-requests`,
        'en',
        'c8y-dashboard'
      );

      cy.wait('@getServiceRequests');

      cy.get('ene-service-request-list-widget-component-widget').within(() => {
        // High priority
        cy.contains('Temperature sensor malfunction')
          .closest('.list-group-item')
          .within(() => {
            cy.get('ene-service-request-icon i.dlt-c8y-icon-high-priority').should('exist').should('be.visible');
          });

        // Medium priority
        cy.contains('Vibration alarm follow-up')
          .closest('.list-group-item')
          .within(() => {
             cy.get('ene-service-request-icon i.dlt-c8y-icon-medium-priority').should('exist').should('be.visible');
          });

        // Low priority
        cy.contains('Device maintenance scheduled')
          .closest('.list-group-item')
          .within(() => {
            cy.get('ene-service-request-icon i.dlt-c8y-icon-info').should('exist').should('be.visible');
          });
      });
    });

    it('should display service request description when expanded', () => {
      cy.intercept(
        'GET',
        '**/service/service-request-mgmt/api/service/request/sr-002/comment*',
        {
          statusCode: 200,
          body: { list: [] },
        }
      ).as('getCommentsEmpty');

      cy.visitShellAndWaitForSelector(
        `device/${deviceId}/service-requests`,
        'en',
        'c8y-dashboard'
      );

      cy.wait('@getServiceRequests');

      cy.get('ene-service-request-list-widget-component-widget').within(() => {
        cy.contains('Vibration alarm follow-up')
          .closest('.list-group-item')
          .within(() => {
            // Expand the service request
            cy.get('.collapse-btn').click();

            // Check description section
            cy.get('.collapse', { timeout: 2000 }).should('be.visible');
            cy.contains('Description').should('be.visible');
            cy.contains(
              'Follow-up on the vibration alarm from yesterday.'
            ).should('be.visible');
          });
      });

      cy.wait('@getCommentsEmpty');
    });

    it('should handle service request with no description', () => {
      const requestWithNoDesc = {
        list: [
          {
            ...mockServiceRequests[0],
            description: null,
          },
        ],
      };

      cy.intercept(
        'GET',
        '**/service/service-request-mgmt/api/service/request*',
        {
          statusCode: 200,
          body: requestWithNoDesc,
        }
      ).as('getServiceRequestsNoDesc');

      cy.intercept(
        'GET',
        '**/service/service-request-mgmt/api/service/request/sr-001/comment*',
        {
          statusCode: 200,
          body: { list: [] },
        }
      ).as('getCommentsForNoDesc');

      cy.visitShellAndWaitForSelector(
        `device/${deviceId}/service-requests`,
        'en',
        'c8y-dashboard'
      );

      cy.wait('@getServiceRequestsNoDesc');

      cy.get('ene-service-request-list-widget-component-widget').within(() => {
        cy.contains('Temperature sensor malfunction')
          .closest('.list-group-item')
          .within(() => {
            // Expand the service request
            cy.get('.collapse-btn').click();

            // Check for "no description" message
            cy.get('.collapse', { timeout: 2000 }).should('be.visible');
            cy.contains('No description provided.').should('be.visible');
          });
      });

      cy.wait('@getCommentsForNoDesc');
    });

    it('should collapse service request when collapse button is clicked again', () => {
      cy.intercept(
        'GET',
        '**/service/service-request-mgmt/api/service/request/sr-001/comment*',
        {
          statusCode: 200,
          body: mockCommentsResponse,
        }
      ).as('getCommentsForCollapse');

      cy.visitShellAndWaitForSelector(
        `device/${deviceId}/service-requests`,
        'en',
        'c8y-dashboard'
      );

      cy.wait('@getServiceRequests');

      cy.get('ene-service-request-list-widget-component-widget').within(() => {
        cy.contains('Temperature sensor malfunction')
          .closest('.list-group-item')
          .within(() => {
            // Initially collapsed
            cy.get('.collapse').should('not.be.visible');

            // Click to expand
            cy.get('.collapse-btn').click();
            cy.get('.collapse', { timeout: 2000 }).should('be.visible');

            // Click to collapse again
            cy.get('.collapse-btn').click();
            cy.get('.collapse', { timeout: 2000 }).should('not.be.visible');
          });
      });

      cy.wait('@getCommentsForCollapse');
    });

    it('should display comment section header when expanded', () => {
      cy.intercept(
        'GET',
        '**/service/service-request-mgmt/api/service/request/sr-001/comment*',
        {
          statusCode: 200,
          body: mockCommentsResponse,
        }
      ).as('getCommentsForHeader');

      cy.visitShellAndWaitForSelector(
        `device/${deviceId}/service-requests`,
        'en',
        'c8y-dashboard'
      );

      cy.wait('@getServiceRequests');

      cy.get('ene-service-request-list-widget-component-widget').within(() => {
        cy.contains('Temperature sensor malfunction')
          .closest('.list-group-item')
          .within(() => {
            // Expand the service request
            cy.get('.collapse-btn').click();

            cy.get('.collapse', { timeout: 2000 }).should('be.visible');
            cy.contains('Comments').should('be.visible');
          });
      });

      cy.wait('@getCommentsForHeader');
    });
  });
});
