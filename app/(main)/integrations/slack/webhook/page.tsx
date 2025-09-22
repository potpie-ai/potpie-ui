"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle, ArrowLeft, ExternalLink, Webhook } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SlackWebhookPage() {
  const router = useRouter();

  const handleBackToIntegrations = () => {
    router.push("/integrations");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Webhook className="w-12 h-12 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Slack Webhook Configuration
          </h1>
          <p className="text-lg text-gray-600">
            Configure webhook endpoints for Slack app events
          </p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Left Column - Webhook Info */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>App Uninstalled Event</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  When users uninstall the Potpie AI app from their Slack
                  workspace, Slack sends an{" "}
                  <code className="bg-gray-100 px-1 rounded">
                    app_uninstalled
                  </code>{" "}
                  event to your webhook endpoint.
                </p>
                <div className="bg-gray-50 rounded-lg p-4">
                  <code className="text-sm font-mono text-gray-800">
                    POST /api/v1/integrations/slack/webhook
                  </code>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  This endpoint should be configured in your Slack app settings
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Event Payload</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  The webhook receives a JSON payload with the following
                  structure:
                </p>
                <div className="bg-gray-50 rounded-lg p-4">
                  <pre className="text-xs font-mono text-gray-800 overflow-x-auto">
                    {`{
  "token": "verification_token",
  "team_id": "T1234567890",
  "api_app_id": "A1234567890",
  "event": {
    "type": "app_uninstalled"
  },
  "type": "event_callback",
  "event_id": "Ev1234567890",
  "event_time": 1234567890
}`}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Implementation Guide */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Backend Implementation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">
                      Required Steps:
                    </h4>
                    <ol className="text-sm text-gray-600 space-y-2">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>
                          Create webhook endpoint at{" "}
                          <code className="bg-gray-100 px-1 rounded">
                            /api/v1/integrations/slack/webhook
                          </code>
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>
                          Verify the request token matches your Slack app's
                          verification token
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>
                          Handle the{" "}
                          <code className="bg-gray-100 px-1 rounded">
                            app_uninstalled
                          </code>{" "}
                          event
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>
                          Update the user's integration status in your database
                        </span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>
                          Clean up any stored tokens or workspace data
                        </span>
                      </li>
                    </ol>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Example Implementation</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Here's a basic example of how to handle the webhook:
                </p>
                <div className="bg-gray-50 rounded-lg p-4">
                  <pre className="text-xs font-mono text-gray-800 overflow-x-auto">
                    {`@app.route('/api/v1/integrations/slack/webhook', methods=['POST'])
def slack_webhook():
    data = request.get_json()
    
    # Verify the token
    if data.get('token') != SLACK_VERIFICATION_TOKEN:
        return jsonify({'error': 'Invalid token'}), 401
    
    # Handle app_uninstalled event
    if data.get('event', {}).get('type') == 'app_uninstalled':
        team_id = data.get('team_id')
        
        # Update user's integration status
        update_slack_integration_status(team_id, False)
        
        # Clean up stored data
        cleanup_slack_workspace_data(team_id)
    
    return jsonify({'status': 'ok'}), 200`}
                  </pre>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Slack App Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Make sure to configure the webhook URL in your Slack app
                    settings:
                  </p>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      <strong>Webhook URL:</strong>{" "}
                      <code className="bg-blue-100 px-1 rounded">
                        https://your-domain.com/api/v1/integrations/slack/webhook
                      </code>
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={() =>
                      window.open(
                        "https://api.slack.com/events/app_uninstalled",
                        "_blank"
                      )
                    }
                  >
                    <ExternalLink className="w-4 h-4" />
                    View Slack Documentation
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={handleBackToIntegrations}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Integrations
          </Button>
        </div>
      </div>
    </div>
  );
}
