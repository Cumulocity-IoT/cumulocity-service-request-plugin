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
        .click();

      cy.get(
        'c8y-dashboard c8y-dashboard-child ene-service-request-list-widget-component-widget'
      )
        .should('exist')
        .should('be.visible');
    });

    it.only('should display the correct widgets on service requests dashboard', () => {
      cy.visitShellAndWaitForSelector(
        `device/${deviceId}/service-requests`,
        'en',
        'c8y-dashboard ene-service-request-list-widget-component-widget'
      );

      // Check if alarm list widget is present
      cy.get(
        'c8y-dashboard c8y-dashboard-child [data-cy="alarm-list-widget-component1"]'
      )
        .should('exist')
        .should('be.visible');

      // Check if service request list widget is present
      cy.get(
        'c8y-dashboard c8y-dashboard-child ene-service-request-list-widget-component-widget'
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
});
