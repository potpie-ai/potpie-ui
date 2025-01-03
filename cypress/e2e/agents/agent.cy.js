describe("Agent Creation Steps", () => {
  beforeEach(() => {
    cy.intercept("GET", "**/list_tools", { fixture: "tools.json" }).as(
      "getTools"
    );
    cy.visit("/agents");
  });

  describe("Step 1 - System Input", () => {
    it("should show system input form initially", () => {
      cy.get('textarea[name="system_prompt"]').should("exist");
      cy.get('[data-test="agent-prev-btn"]').should("be.disabled");
    });

    it("should not allow next step without system prompt", () => {
      cy.get('[data-test="agent-primary-btn"]').click();
      cy.get('textarea[name="system_prompt"]').should("exist");
    });

    it("should allow navigation to next step with valid input", () => {
      cy.get('textarea[name="system_prompt"]').type("Valid system prompt");
      cy.get('[data-test="agent-primary-btn"]').click();
    });
  });

  describe("Step 2 - Agent Details", () => {
    beforeEach(() => {
      cy.get('textarea[name="system_prompt"]').type("Valid system prompt");
      cy.get('[data-test="agent-primary-btn"]').click();
    });

    it("should show all required fields", () => {
      cy.get('textarea[name="role"]').should("exist");
      cy.get('textarea[name="goal"]').should("exist");
      cy.get('textarea[name="backstory"]').should("exist");
    });

    it("should not allow next step without required fields", () => {
      cy.get('[data-test="agent-primary-btn"]').click();
      cy.get('textarea[name="role"]').should("exist");
      cy.get('textarea[name="goal"]').should("exist");
      cy.get('textarea[name="backstory"]').should("exist");
    });

    it("should allow navigation with valid inputs", () => {
      cy.get('textarea[name="role"]').type("Test Role");
      cy.get('textarea[name="goal"]').type("Test Goal");
      cy.get('textarea[name="backstory"]').type("Test Backstory");
      cy.get('[data-test="agent-primary-btn"]').click();
    });

    it("should allow navigation back to step 1", () => {
      cy.get('[data-test="agent-prev-btn"]').click();
      cy.get('textarea[name="system_prompt"]').should("exist");
    });

    it("should preserve data when navigating between steps", () => {
      cy.get('textarea[name="role"]').type("Test Role");
      cy.get('textarea[name="goal"]').type("Test Goal");
      cy.get('textarea[name="backstory"]').type("Test Backstory");
      cy.get('[data-test="agent-prev-btn"]').click();
      cy.get('[data-test="agent-primary-btn"]').click();
      cy.get('textarea[name="role"]').should("have.value", "Test Role");
      cy.get('textarea[name="goal"]').should("have.value", "Test Goal");
      cy.get('textarea[name="backstory"]').should(
        "have.value",
        "Test Backstory"
      );
    });
  });

  describe("Step 3 - Task Management", () => {
    beforeEach(() => {
      cy.get('textarea[name="system_prompt"]').type("Valid system prompt");
      cy.get('[data-test="agent-primary-btn"]').click();
      cy.get('textarea[name="role"]').type("Test Role");
      cy.get('textarea[name="goal"]').type("Test Goal");
      cy.get('textarea[name="backstory"]').type("Test Backstory");
      cy.get('[data-test="agent-primary-btn"]').click();
    });

    it("should show task management form after completing previous steps", () => {
      cy.get('[data-test="task-list"]')
        .first()
        .within(() => {
          cy.contains("Task 1");
          cy.get('textarea[name="tasks.0.description"]').should("exist");
          cy.get('textarea[name="tasks.0.expected_output.output"]').should(
            "exist"
          );
        });
    });

    it("should allow navigation back through all steps", () => {
      cy.get('[data-test="agent-prev-btn"]').click();
      cy.get('textarea[name="role"]').should("exist");
      cy.get('[data-test="agent-prev-btn"]').click();
      cy.get('textarea[name="system_prompt"]').should("exist");
    });
  });

  describe("Task Management", () => {
    beforeEach(() => {
      cy.intercept("GET", "**/tools", { fixture: "tools.json" }).as("getTools");
      cy.get('textarea[name="system_prompt"]').type("Valid system prompt");
      cy.get('[data-test="agent-primary-btn"]').click();
      cy.get('textarea[name="role"]').type("Test Role");
      cy.get('textarea[name="goal"]').type("Test Goal");
      cy.get('textarea[name="backstory"]').type("Test Backstory");
      cy.get('[data-test="agent-primary-btn"]').click();
      cy.get('[data-test="task-list"]').as("taskList");
    });

    describe("Task Card Operations", () => {
      it("should display initial task card with required fields", () => {
        cy.get("@taskList")
          .first()
          .within(() => {
            cy.contains("Task 1");
            cy.get('textarea[name="tasks.0.description"]').should("exist");
            cy.get('textarea[name="tasks.0.expected_output.output"]').should(
              "exist"
            );
          });
      });

      it("should add new task card when clicking Add Task button", () => {
        cy.get("@taskList").should("have.length", 1);
        cy.contains("button", "Add Task").click();
        cy.get("@taskList").children().should("have.length", 3);
        cy.get("@taskList")
          .children()
          .eq(-2)
          .within(() => {
            cy.contains("Task 2");
            cy.get('textarea[name="tasks.1.description"]').should("exist");
          });
      });

      it("should remove task card when clicking remove button", () => {
        cy.get("@taskList").should("have.length", 1);
        cy.contains("button", "Add Task").click();
        cy.get("@taskList").children().should("have.length", 3);
        cy.get('[data-test="remove-task"]').last().click();
        cy.get("@taskList").children().should("have.length", 2);
      });

      it("should not show remove button when only one task exists", () => {
        cy.get("@taskList")
          .first()
          .within(() => {
            cy.get('[data-test="remove-task"]').should("not.exist");
          });
      });

      it("should limit task cards to maximum of 5", () => {
        for (let i = 0; i < 4; i++) {
          cy.contains("button", "Add Task").click();
        }
        cy.get("@taskList").children().should("have.length", 5);
        cy.contains("button", "Add Task").should("not.exist");
      });
    });

    describe("Task Form Validation", () => {
      it("should validate JSON in expected output field", () => {
        cy.get('textarea[name="tasks.0.expected_output.output"]').type(
          "invalid json"
        );
        cy.get('[data-test="agent-primary-btn"]').click();
        cy.contains("Expected output must be valid JSON");

        cy.get('textarea[name="tasks.0.expected_output.output"]')
          .clear()
          .type('{"valid": "json"}', { parseSpecialCharSequences: false });
        cy.get('[data-test="agent-primary-btn"]').click();
        cy.contains("Expected output must be valid JSON").should("not.exist");
      });

      it("should require description field", () => {
        cy.get('[data-test="agent-primary-btn"]').click();
        cy.contains("Description is required");
      });

      // it.only("should require at least one tool selection", () => {
      //   cy.wait("@getTools");
      //   cy.get('[data-test="agent-primary-btn"]').click();
      // });
    });
  });
});
