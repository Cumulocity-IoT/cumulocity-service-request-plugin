describe('Service Request Modal', () => {
  const deviceId = Cypress.env('C8Y_DEVICE_ID');

  before(() => {
    Cypress.session.clearAllSavedSessions();
  });

  beforeEach(() => {
    cy.getAuth().login().disableGainsight();
  });

  describe('Create Service Request from Alarm', () => {
    const mockAlarm = {
      id: '1001',
      type: 'c8y_TemperatureAlarm',
      severity: 'CRITICAL',
      status: 'ACTIVE',
      text: 'High temperature detected',
      time: '2025-12-22T10:00:00.000Z',
      creationTime: '2025-12-22T10:00:00.000Z',
      lastUpdated: '2025-12-22T10:00:00.000Z',
      count: 1,
      source: {
        id: deviceId,
        name: 'Test Device',
        self: `https://example.cumulocity.com/inventory/managedObjects/${deviceId}`,
      },
      self: 'https://example.cumulocity.com/alarm/alarms/1001',
    };

    const mockAlarmsResponse = {
      alarms: [mockAlarm],
      statistics: {
        currentPage: 1,
        pageSize: 20,
        totalPages: 1,
      },
      self: 'https://example.cumulocity.com/alarm/alarms',
    };

    const mockDevice = {
      id: deviceId,
      name: 'Test Device',
      type: 'c8y_Device',
      self: `https://example.cumulocity.com/inventory/managedObjects/${deviceId}`,
    };

    const mockStatuses = [
      {
        id: '1',
        name: 'Open',
      },
      {
        id: '2',
        name: 'In Progress',
      },
      {
        id: '3',
        name: 'Closed',
      },
    ];

    const mockPriorities = [
      {
        name: 'Low',
        ordinal: 1,
      },
      {
        name: 'Medium',
        ordinal: 2,
      },
      {
        name: 'High',
        ordinal: 3,
      },
    ];

    const mockCreatedServiceRequest = {
      id: 'sr-new-001',
      title: 'High temperature detected',
      description: 'Temperature sensor is reporting values above threshold',
      status: {
        id: '1',
        name: 'Open',
      },
      priority: {
        name: 'High',
        ordinal: 3,
      },
      isActive: true,
      creationTime: '2026-01-05T10:00:00.000Z',
      updateTime: '2026-01-05T10:00:00.000Z',
      lastUpdated: '2026-01-05T10:00:00.000Z',
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
    };

    beforeEach(() => {
      // Mock alarm list
      cy.intercept('GET', '**/alarm/alarms*', {
        statusCode: 200,
        body: mockAlarmsResponse,
      }).as('getAlarms');

      // Mock device detail
      cy.intercept('GET', `**/inventory/managedObjects/${deviceId}`, {
        statusCode: 200,
        body: mockDevice,
      }).as('getDevice');

      // Mock status list
      cy.intercept(
        'GET',
        '**/service/service-request-mgmt/api/service/request/status',
        {
          statusCode: 200,
          body: mockStatuses,
        }
      ).as('getStatuses');

      // Mock priority list
      cy.intercept(
        'GET',
        '**/service/service-request-mgmt/api/service/request/priority',
        {
          statusCode: 200,
          body: mockPriorities,
        }
      ).as('getPriorities');
    });

    it('should open service request modal from alarm list widget', () => {
      cy.visitShellAndWaitForSelector(
        `device/${deviceId}/service-requests`,
        'en',
        'c8y-dashboard'
      );

      cy.wait('@getAlarms');

      cy.get('[data-cy="alarm-list-widget-component"]').within(() => {
        cy.get('[data-cy="alarm-list-create-service-request-button"]')
          .first()
          .click();
      });

      cy.get('[data-cy="service-request-details-modal"]', { timeout: 10000 })
        .should('exist')
        .should('be.visible');
    });

    it('should display modal with correct title', () => {
      cy.visitShellAndWaitForSelector(
        `device/${deviceId}/service-requests`,
        'en',
        'c8y-dashboard'
      );

      cy.wait('@getAlarms');

      cy.get('[data-cy="alarm-list-widget-component"]').within(() => {
        cy.get('[data-cy="alarm-list-create-service-request-button"]')
          .first()
          .click();
      });

      cy.get('[data-cy="service-request-details-modal"]').within(() => {
        cy.get('#modal-title').should('contain', 'Service Request');
      });
    });

    it('should pre-fill title from alarm text', () => {
      cy.visitShellAndWaitForSelector(
        `device/${deviceId}/service-requests`,
        'en',
        'c8y-dashboard'
      );

      cy.wait('@getAlarms');

      cy.get('[data-cy="alarm-list-widget-component"]').within(() => {
        cy.get('[data-cy="alarm-list-create-service-request-button"]')
          .first()
          .click();
      });

      cy.wait('@getStatuses');
      cy.wait('@getPriorities');

      cy.get('[data-cy="service-request-details-modal"]').within(() => {
        cy.get('#sr_title').should('have.value', 'High temperature detected');
      });
    });

    it('should display all form fields', () => {
      cy.visitShellAndWaitForSelector(
        `device/${deviceId}/service-requests`,
        'en',
        'c8y-dashboard'
      );

      cy.wait('@getAlarms');

      cy.get('[data-cy="alarm-list-widget-component"]').within(() => {
        cy.get('[data-cy="alarm-list-create-service-request-button"]')
          .first()
          .click();
      });

      cy.wait('@getStatuses');
      cy.wait('@getPriorities');

      cy.get('[data-cy="service-request-details-modal"]').within(() => {
        cy.get('#sr_title').should('exist');
        cy.get('#sr_priority').should('exist');
        cy.get('#sr_status').should('exist');
        cy.get('#sr_description').should('exist');
      });
    });

    it('should populate priority dropdown with available priorities', () => {
      cy.visitShellAndWaitForSelector(
        `device/${deviceId}/service-requests`,
        'en',
        'c8y-dashboard'
      );

      cy.get('[data-cy="alarm-list-widget-component"]').within(() => {
        cy.get('[data-cy="alarm-list-create-service-request-button"]')
          .first()
          .click();
      });

      cy.get('[data-cy="service-request-details-modal"]')
        .should('exist')
        .should('be.visible');

      cy.wait('@getAlarms');

      cy.wait('@getPriorities');

      cy.get('[data-cy="service-request-details-modal"]').within(() => {
        cy.get('#sr_priority option').should('have.length', 3);
        cy.get('#sr_priority option').eq(0).should('contain', 'Low');
        cy.get('#sr_priority option').eq(1).should('contain', 'Medium');
        cy.get('#sr_priority option').eq(2).should('contain', 'High');
      });
    });

    it('should populate status dropdown with available statuses', () => {
      cy.visitShellAndWaitForSelector(
        `device/${deviceId}/service-requests`,
        'en',
        'c8y-dashboard'
      );

      cy.get('[data-cy="alarm-list-widget-component"]').within(() => {
        cy.get('[data-cy="alarm-list-create-service-request-button"]')
          .first()
          .click();
      });

      cy.get('[data-cy="service-request-details-modal"]')
        .should('exist')
        .should('be.visible');

      cy.wait('@getAlarms');

      cy.wait('@getStatuses');

      cy.get('[data-cy="service-request-details-modal"]').within(() => {
        cy.get('#sr_status option').should('have.length', 3);
        cy.get('#sr_status option').eq(0).should('contain', 'Open');
        cy.get('#sr_status option').eq(1).should('contain', 'In Progress');
        cy.get('#sr_status option').eq(2).should('contain', 'Closed');
      });
    });

    it('should allow changing priority', () => {
      cy.visitShellAndWaitForSelector(
        `device/${deviceId}/service-requests`,
        'en',
        'c8y-dashboard'
      );

      cy.get('[data-cy="alarm-list-widget-component"]').within(() => {
        cy.get('[data-cy="alarm-list-create-service-request-button"]')
          .first()
          .click();
      });

      cy.get('[data-cy="service-request-details-modal"]')
        .should('exist')
        .should('be.visible');

      cy.wait('@getAlarms');

      cy.wait('@getPriorities');

      cy.get('[data-cy="service-request-details-modal"]').within(() => {
        cy.get('#sr_priority').select('High');
        cy.get('#sr_priority').should('have.value', '2: Object');
      });
    });

    it('should allow editing title', () => {
      cy.visitShellAndWaitForSelector(
        `device/${deviceId}/service-requests`,
        'en',
        'c8y-dashboard'
      );
      cy.get('[data-cy="alarm-list-widget-component"]').within(() => {
        cy.get('[data-cy="alarm-list-create-service-request-button"]')
          .first()
          .click();
      });

      cy.get('[data-cy="service-request-details-modal"]')
        .should('exist')
        .should('be.visible');

      cy.wait('@getAlarms');

      cy.wait('@getStatuses');
      cy.wait('@getPriorities');

      cy.get('[data-cy="service-request-details-modal"]').within(() => {
        cy.get('#sr_title').clear().type('Custom service request title');
        cy.get('#sr_title').should(
          'have.value',
          'Custom service request title'
        );
      });
    });

    it('should allow adding description', () => {
      cy.visitShellAndWaitForSelector(
        `device/${deviceId}/service-requests`,
        'en',
        'c8y-dashboard'
      );

      cy.get('[data-cy="alarm-list-widget-component"]').within(() => {
        cy.get('[data-cy="alarm-list-create-service-request-button"]')
          .first()
          .click();
      });

      cy.get('[data-cy="service-request-details-modal"]')
        .should('exist')
        .should('be.visible');

      cy.wait('@getAlarms');

      cy.wait('@getStatuses');
      cy.wait('@getPriorities');

      cy.get('[data-cy="service-request-details-modal"]').within(() => {
        cy.get('#sr_description').type(
          'This is a detailed description of the issue'
        );
        cy.get('#sr_description').should(
          'have.value',
          'This is a detailed description of the issue'
        );
      });
    });

    it('should display tabs for measurements, events, and alarms', () => {
      cy.visitShellAndWaitForSelector(
        `device/${deviceId}/service-requests`,
        'en',
        'c8y-dashboard'
      );

      cy.wait('@getAlarms');

      cy.get('[data-cy="alarm-list-widget-component"]').within(() => {
        cy.get('[data-cy="alarm-list-create-service-request-button"]')
          .first()
          .click();
      });

      cy.wait('@getStatuses');
      cy.wait('@getPriorities');

      cy.get('[data-cy="service-request-details-modal"]').within(() => {
        cy.contains('.nav-tabs button', 'Measurements').should('exist');
        cy.contains('.nav-tabs button', 'Events').should('exist');
        cy.contains('.nav-tabs button', 'Alarms').should('exist');
      });
    });

    it('should have alarms tab active by default', () => {
      cy.visitShellAndWaitForSelector(
        `device/${deviceId}/service-requests`,
        'en',
        'c8y-dashboard'
      );

      cy.wait('@getAlarms');

      cy.get('[data-cy="alarm-list-widget-component"]').within(() => {
        cy.get('[data-cy="alarm-list-create-service-request-button"]')
          .first()
          .click();
      });

      cy.wait('@getStatuses');
      cy.wait('@getPriorities');

      cy.get('[data-cy="service-request-details-modal"]').within(() => {
        cy.contains('.nav-tabs button', 'Alarms')
          .parent()
          .should('have.class', 'active');
      });
    });

    it('should disable submit button when title is empty', () => {
      cy.visitShellAndWaitForSelector(
        `device/${deviceId}/service-requests`,
        'en',
        'c8y-dashboard'
      );

      cy.wait('@getAlarms');

      cy.get('[data-cy="alarm-list-widget-component"]').within(() => {
        cy.get('[data-cy="alarm-list-create-service-request-button"]')
          .first()
          .click();
      });

      cy.wait('@getStatuses');
      cy.wait('@getPriorities');

      cy.get('[data-cy="service-request-details-modal"]').within(() => {
        cy.get('#sr_title').clear();
        cy.contains('button', 'Submit').should('be.disabled');
      });
    });

    it('should enable submit button when form is valid', () => {
      cy.visitShellAndWaitForSelector(
        `device/${deviceId}/service-requests`,
        'en',
        'c8y-dashboard'
      );

      cy.wait('@getAlarms');

      cy.get('[data-cy="alarm-list-widget-component"]').within(() => {
        cy.get('[data-cy="alarm-list-create-service-request-button"]')
          .first()
          .click();
      });

      cy.wait('@getStatuses');
      cy.wait('@getPriorities');

      cy.get('[data-cy="service-request-details-modal"]').within(() => {
        cy.get('#sr_title').should('not.be.empty');
        cy.contains('button', 'Submit').should('not.be.disabled');
      });
    });

    it('should create service request when submit is clicked', () => {
      // Mock service request list - must be before visit
      cy.intercept(
        'GET',
        '**/service/service-request-mgmt/api/service/request?*',
        {
          statusCode: 200,
          body: { list: [] },
        }
      ).as('getServiceRequests');

      // Mock service request creation - must be before visit
      cy.intercept(
        'POST',
        '**/service/service-request-mgmt/api/service/request*',
        {
          statusCode: 200,
          body: mockCreatedServiceRequest,
        }
      ).as('createServiceRequest');

      cy.visitShellAndWaitForSelector(
        `device/${deviceId}/service-requests`,
        'en',
        'c8y-dashboard'
      );

      cy.wait('@getAlarms');
      cy.wait('@getServiceRequests');

      cy.get('[data-cy="alarm-list-widget-component"]').within(() => {
        cy.get('[data-cy="alarm-list-create-service-request-button"]')
          .first()
          .click();
      });

      cy.get('[data-cy="service-request-details-modal"]', { timeout: 10000 })
        .should('exist')
        .should('be.visible');

      cy.wait('@getStatuses');
      cy.wait('@getPriorities');

      cy.get('[data-cy="service-request-details-modal"]').within(() => {
        cy.get('#sr_description').type(
          'Temperature sensor is reporting values above threshold'
        );
        cy.get('#sr_priority').select('High');
        cy.contains('button', 'Submit').click();
      });

      cy.wait('@createServiceRequest').then((interception) => {
        expect(interception.request.body).to.have.property(
          'title',
          'High temperature detected'
        );
        expect(interception.request.body).to.have.property(
          'description',
          'Temperature sensor is reporting values above threshold'
        );
        expect(interception.request.body.priority).to.have.property(
          'name',
          'High'
        );
        expect(interception.request.body.priority).to.have.property(
          'ordinal',
          3
        );
      });
    });

    it('should close modal after successful submission', () => {
      cy.intercept(
        'GET',
        '**/service/service-request-mgmt/api/service/request*',
        {
          statusCode: 200,
          body: { list: [] },
        }
      ).as('getServiceRequests');

      cy.intercept(
        'POST',
        '**/service/service-request-mgmt/api/service/request*',
        {
          statusCode: 200,
          body: mockCreatedServiceRequest,
        }
      ).as('createServiceRequest');

      // Mock detail fetch after creation
      cy.intercept(
        'GET',
        `**/service/service-request-mgmt/api/service/request/${mockCreatedServiceRequest.id}`,
        {
          statusCode: 200,
          body: mockCreatedServiceRequest,
        }
      ).as('getServiceRequestDetail');

      cy.visitShellAndWaitForSelector(
        `device/${deviceId}/service-requests`,
        'en',
        'c8y-dashboard'
      );

      cy.wait('@getAlarms');

      cy.get('[data-cy="alarm-list-widget-component"]').within(() => {
        cy.get('[data-cy="alarm-list-create-service-request-button"]')
          .first()
          .click();
      });

      cy.wait('@getStatuses');
      cy.wait('@getPriorities');

      cy.get('[data-cy="service-request-details-modal"]').within(() => {
        cy.contains('button', 'Submit').click();
      });

      cy.wait('@createServiceRequest');
      cy.wait('@getServiceRequestDetail');

      // Modal should close
      cy.get('[data-cy="service-request-details-modal"]').should('not.exist');
    });

    it('should close modal when cancel is clicked', () => {
      cy.visitShellAndWaitForSelector(
        `device/${deviceId}/service-requests`,
        'en',
        'c8y-dashboard'
      );

      cy.wait('@getAlarms');

      cy.get('[data-cy="alarm-list-widget-component"]').within(() => {
        cy.get('[data-cy="alarm-list-create-service-request-button"]')
          .first()
          .click();
      });

      cy.wait('@getStatuses');
      cy.wait('@getPriorities');

      cy.get('[data-cy="service-request-details-modal"]').within(() => {
        cy.contains('button', 'Cancel').click();
      });

      // Modal should close
      cy.get('[data-cy="service-request-details-modal"]').should('not.exist');
    });

    it('should show submit button in pending state during creation', () => {
      cy.intercept(
        'GET',
        '**/service/service-request-mgmt/api/service/request*',
        {
          statusCode: 200,
          body: { list: [] },
        }
      ).as('getServiceRequests');

      cy.intercept(
        'POST',
        '**/service/service-request-mgmt/api/service/request/',
        (req) => {
          req.reply((res) => {
            res.delay = 2000;
            res.send({
              statusCode: 200,
              body: mockCreatedServiceRequest,
            });
          });
        }
      ).as('createServiceRequestDelayed');

      cy.visitShellAndWaitForSelector(
        `device/${deviceId}/service-requests`,
        'en',
        'c8y-dashboard'
      );

      cy.wait('@getAlarms');

      cy.get('[data-cy="alarm-list-widget-component"]').within(() => {
        cy.get('[data-cy="alarm-list-create-service-request-button"]')
          .first()
          .click();
      });

      cy.wait('@getStatuses');
      cy.wait('@getPriorities');

      cy.get('[data-cy="service-request-details-modal"]').within(() => {
        cy.contains('button', 'Submit').click();

        // Check for pending state
        cy.contains('button', 'Submit').should('have.class', 'btn-pending');
        cy.contains('button', 'Submit').should('be.disabled');
      });
    });

    it('should include alarm reference in created service request', () => {
      cy.intercept(
        'GET',
        '**/service/service-request-mgmt/api/service/request*',
        {
          statusCode: 200,
          body: { list: [] },
        }
      ).as('getServiceRequests');

      cy.intercept(
        'POST',
        '**/service/service-request-mgmt/api/service/request*',
        {
          statusCode: 200,
          body: mockCreatedServiceRequest,
        }
      ).as('createServiceRequest');

      cy.visitShellAndWaitForSelector(
        `device/${deviceId}/service-requests`,
        'en',
        'c8y-dashboard'
      );

      cy.wait('@getAlarms');

      cy.get('[data-cy="alarm-list-widget-component"]').within(() => {
        cy.get('[data-cy="alarm-list-create-service-request-button"]')
          .first()
          .click();
      });

      cy.wait('@getStatuses');
      cy.wait('@getPriorities');

      cy.get('[data-cy="service-request-details-modal"]').within(() => {
        cy.contains('button', 'Submit').click();
      });

      cy.wait('@createServiceRequest').then((interception) => {
        expect(interception.request.body.alarmRef).to.deep.equal({
          uri: 'https://example.cumulocity.com/alarm/alarms/1001',
          id: '1001',
        });
      });
    });

    it('should include device source in created service request', () => {
      cy.intercept(
        'GET',
        '**/service/service-request-mgmt/api/service/request*',
        {
          statusCode: 200,
          body: { list: [] },
        }
      ).as('getServiceRequests');

      cy.intercept(
        'POST',
        '**/service/service-request-mgmt/api/service/request*',
        {
          statusCode: 200,
          body: mockCreatedServiceRequest,
        }
      ).as('createServiceRequest');

      cy.visitShellAndWaitForSelector(
        `device/${deviceId}/service-requests`,
        'en',
        'c8y-dashboard'
      );

      cy.wait('@getAlarms');

      cy.get('[data-cy="alarm-list-widget-component"]').within(() => {
        cy.get('[data-cy="alarm-list-create-service-request-button"]')
          .first()
          .click();
      });

      cy.wait('@getStatuses');
      cy.wait('@getPriorities');

      cy.get('[data-cy="service-request-details-modal"]').within(() => {
        cy.contains('button', 'Submit').click();
      });

      cy.wait('@createServiceRequest').then((interception) => {
        expect(interception.request.body.source).to.deep.equal({
          id: deviceId,
          self: `https://example.cumulocity.com/inventory/managedObjects/${deviceId}`,
          name: 'Test Device',
        });
      });
    });

    it('should send type as "alarm" in created service request', () => {
      cy.intercept(
        'GET',
        '**/service/service-request-mgmt/api/service/request*',
        {
          statusCode: 200,
          body: { list: [] },
        }
      ).as('getServiceRequests');

      cy.intercept(
        'POST',
        '**/service/service-request-mgmt/api/service/request*',
        {
          statusCode: 200,
          body: mockCreatedServiceRequest,
        }
      ).as('createServiceRequest');

      cy.visitShellAndWaitForSelector(
        `device/${deviceId}/service-requests`,
        'en',
        'c8y-dashboard'
      );

      cy.wait('@getAlarms');

      cy.get('[data-cy="alarm-list-widget-component"]').within(() => {
        cy.get('[data-cy="alarm-list-create-service-request-button"]')
          .first()
          .click();
      });

      cy.wait('@getStatuses');
      cy.wait('@getPriorities');

      cy.get('[data-cy="service-request-details-modal"]').within(() => {
        cy.contains('button', 'Submit').click();
      });

      cy.wait('@createServiceRequest').then((interception) => {
        expect(interception.request.body).to.have.property('type', 'alarm');
      });
    });
  });

  describe('Edit Service Request', () => {
    const mockDevice = {
      id: deviceId,
      name: 'Test Device',
      type: 'c8y_Device',
      self: `https://example.cumulocity.com/inventory/managedObjects/${deviceId}`,
    };

    const mockStatuses = [
      {
        id: '1',
        name: 'Open',
      },
      {
        id: '2',
        name: 'In Progress',
      },
      {
        id: '10',
        name: 'Closed',
      },
    ];

    const mockPriorities = [
      {
        name: 'Low',
        ordinal: 1,
      },
      {
        name: 'Medium',
        ordinal: 2,
      },
      {
        name: 'High',
        ordinal: 3,
      },
    ];

    const mockServiceRequest = {
      id: 'sr-001',
      title: 'Temperature sensor malfunction',
      description: 'The temperature sensor is reporting incorrect values.',
      status: {
        id: '1',
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
    };

    const mockServiceRequestsResponse = {
      list: [mockServiceRequest],
    };

    beforeEach(() => {
      // Mock service request list
      cy.intercept(
        'GET',
        '**/service/service-request-mgmt/api/service/request*',
        {
          statusCode: 200,
          body: mockServiceRequestsResponse,
        }
      ).as('getServiceRequests');

      // Mock device detail
      cy.intercept('GET', `**/inventory/managedObjects/${deviceId}`, {
        statusCode: 200,
        body: mockDevice,
      }).as('getDevice');

      // Mock status list
      cy.intercept(
        'GET',
        '**/service/service-request-mgmt/api/service/request/status',
        {
          statusCode: 200,
          body: mockStatuses,
        }
      ).as('getStatuses');

      // Mock priority list
      cy.intercept(
        'GET',
        '**/service/service-request-mgmt/api/service/request/priority',
        {
          statusCode: 200,
          body: mockPriorities,
        }
      ).as('getPriorities');

      // Mock comments (empty for simplicity)
      cy.intercept(
        'GET',
        '**/service/service-request-mgmt/api/service/request/sr-001/comment*',
        {
          statusCode: 200,
          body: { list: [] },
        }
      ).as('getComments');
    });

    it('should open edit modal when clicking on service request title', () => {
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

    it('should display existing service request data in edit mode', () => {
      cy.visitShellAndWaitForSelector(
        `device/${deviceId}/service-requests`,
        'en',
        'c8y-dashboard'
      );

      cy.wait('@getServiceRequests');

      cy.get('ene-service-request-list-widget-component-widget').within(() => {
        cy.contains('button', 'Temperature sensor malfunction').click();
      });

      cy.wait('@getStatuses');
      cy.wait('@getPriorities');

      cy.get('[data-cy="service-request-details-modal"]').within(() => {
        cy.get('#sr_title').should(
          'have.value',
          'Temperature sensor malfunction'
        );
        cy.get('#sr_description').should(
          'have.value',
          'The temperature sensor is reporting incorrect values.'
        );
      });
    });

    it('should show Update, Cancel, and Reset buttons in edit mode', () => {
      cy.visitShellAndWaitForSelector(
        `device/${deviceId}/service-requests`,
        'en',
        'c8y-dashboard'
      );

      cy.wait('@getServiceRequests');

      cy.get('ene-service-request-list-widget-component-widget').within(() => {
        cy.contains('button', 'Temperature sensor malfunction').click();
      });

      cy.wait('@getStatuses');
      cy.wait('@getPriorities');

      cy.get('[data-cy="service-request-details-modal"]').within(() => {
        cy.contains('button', 'Update').should('exist');
        cy.contains('button', 'Cancel').should('exist');
        cy.contains('button', 'Reset').should('exist');
      });
    });

    it('should show Resolve button in edit mode', () => {
      cy.visitShellAndWaitForSelector(
        `device/${deviceId}/service-requests`,
        'en',
        'c8y-dashboard'
      );

      cy.wait('@getServiceRequests');

      cy.get('ene-service-request-list-widget-component-widget').within(() => {
        cy.contains('button', 'Temperature sensor malfunction').click();
      });

      cy.wait('@getStatuses');
      cy.wait('@getPriorities');

      cy.get('[data-cy="service-request-details-modal"]').within(() => {
        cy.contains('button', 'Resolve').should('exist');
      });
    });

    it('should disable Update button when form is pristine', () => {
      cy.visitShellAndWaitForSelector(
        `device/${deviceId}/service-requests`,
        'en',
        'c8y-dashboard'
      );

      cy.wait('@getServiceRequests');

      cy.get('ene-service-request-list-widget-component-widget').within(() => {
        cy.contains('button', 'Temperature sensor malfunction').click();
      });

      cy.wait('@getStatuses');
      cy.wait('@getPriorities');

      cy.get('[data-cy="service-request-details-modal"]').within(() => {
        cy.contains('button', 'Update').should('be.disabled');
      });
    });

    it('should enable Update button when form is modified', () => {
      cy.visitShellAndWaitForSelector(
        `device/${deviceId}/service-requests`,
        'en',
        'c8y-dashboard'
      );

      cy.wait('@getServiceRequests');

      cy.get('ene-service-request-list-widget-component-widget').within(() => {
        cy.contains('button', 'Temperature sensor malfunction').click();
      });

      cy.wait('@getStatuses');
      cy.wait('@getPriorities');

      cy.get('[data-cy="service-request-details-modal"]').within(() => {
        cy.get('#sr_description').type(' Additional information.');
        cy.contains('button', 'Update').should('not.be.disabled');
      });
    });

    it('should update service request when Update is clicked', () => {
      const updatedServiceRequest = {
        ...mockServiceRequest,
        description:
          'The temperature sensor is reporting incorrect values. Updated description.',
      };

      cy.intercept(
        'PUT',
        '**/service/service-request-mgmt/api/service/request/sr-001',
        {
          statusCode: 200,
          body: updatedServiceRequest,
        }
      ).as('updateServiceRequest');

      cy.visitShellAndWaitForSelector(
        `device/${deviceId}/service-requests`,
        'en',
        'c8y-dashboard'
      );

      cy.wait('@getServiceRequests');

      cy.get('ene-service-request-list-widget-component-widget').within(() => {
        cy.contains('button', 'Temperature sensor malfunction').click();
      });

      cy.wait('@getStatuses');
      cy.wait('@getPriorities');

      cy.get('[data-cy="service-request-details-modal"]').within(() => {
        cy.get('#sr_description').type(' Updated description.');
        cy.contains('button', 'Update').click();
      });

      cy.wait('@updateServiceRequest').then((interception) => {
        expect(interception.request.body.description).to.include(
          'Updated description'
        );
      });
    });

    it('should reset form when Reset button is clicked', () => {
      cy.visitShellAndWaitForSelector(
        `device/${deviceId}/service-requests`,
        'en',
        'c8y-dashboard'
      );

      cy.wait('@getServiceRequests');

      cy.get('ene-service-request-list-widget-component-widget').within(() => {
        cy.contains('button', 'Temperature sensor malfunction').click();
      });

      cy.wait('@getStatuses');
      cy.wait('@getPriorities');

      cy.get('[data-cy="service-request-details-modal"]').within(() => {
        const originalDescription =
          'The temperature sensor is reporting incorrect values.';

        cy.get('#sr_description').type(' Modified text');
        cy.get('#sr_description').should('not.have.value', originalDescription);

        cy.contains('button', 'Reset').click();

        cy.get('#sr_description').should('have.value', originalDescription);
        cy.contains('button', 'Update').should('be.disabled');
      });
    });

    it('should display comments section in edit mode', () => {
      cy.visitShellAndWaitForSelector(
        `device/${deviceId}/service-requests`,
        'en',
        'c8y-dashboard'
      );

      cy.wait('@getServiceRequests');

      cy.get('ene-service-request-list-widget-component-widget').within(() => {
        cy.contains('button', 'Temperature sensor malfunction').click();
      });

      cy.wait('@getStatuses');
      cy.wait('@getPriorities');

      cy.get('[data-cy="service-request-details-modal"]').within(() => {
        cy.get('service-request-comments').should('exist');
      });
    });

    it('should disable form when service request is not active', () => {
      const inactiveServiceRequest = {
        ...mockServiceRequest,
        isActive: false,
      };

      cy.intercept(
        'GET',
        '**/service/service-request-mgmt/api/service/request*',
        {
          statusCode: 200,
          body: { list: [inactiveServiceRequest] },
        }
      ).as('getInactiveServiceRequest');

      cy.visitShellAndWaitForSelector(
        `device/${deviceId}/service-requests`,
        'en',
        'c8y-dashboard'
      );

      cy.wait('@getInactiveServiceRequest');

      cy.get('ene-service-request-list-widget-component-widget').within(() => {
        cy.contains('button', 'Temperature sensor malfunction').click();
      });

      cy.wait('@getStatuses');
      cy.wait('@getPriorities');

      cy.get('[data-cy="service-request-details-modal"]').within(() => {
        cy.get('#sr_title').should('be.disabled');
        cy.get('#sr_description').should('be.disabled');
        cy.get('#sr_priority').should('be.disabled');
        cy.contains('button', 'Resolve').should('be.disabled');
      });
    });

    it('should have disabled status field in edit mode', () => {
      cy.visitShellAndWaitForSelector(
        `device/${deviceId}/service-requests`,
        'en',
        'c8y-dashboard'
      );

      cy.wait('@getServiceRequests');

      cy.get('ene-service-request-list-widget-component-widget').within(() => {
        cy.contains('button', 'Temperature sensor malfunction').click();
      });

      cy.wait('@getStatuses');
      cy.wait('@getPriorities');

      cy.get('[data-cy="service-request-details-modal"]').within(() => {
        cy.get('#sr_status').should('be.disabled');
      });
    });
  });
});
