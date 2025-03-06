"use client"
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useAuthContext } from "@/contexts/AuthContext";
import MinorService from "@/services/minorService";
import axios from 'axios';

const PricingPage = () => {
  const { user } = useAuthContext();
  const userId = user?.uid;
  const plans = [
    {
      name: 'Individual - Free',
      price: '0',
      description: 'For individual developers who want to explore the open-source potpie platform',
      features: [
        'Ready-to-use agents',
        '50 requests/month',
        'Unlimited if using your own keys',
        'Only public repos',
        'Multi-LLM Support',
        'Tool library',
        'Community support'
      ],
      buttonText: 'Get Started',
      borderColor: 'border-gray-200',
      buttonColor: 'bg-blue-600 hover:bg-blue-700'
    },
    {
      name: 'Early-Stage',
      price: '20',
      description: 'For startups that have raised less than 100K USD and are pre-revenue',
      features: [
        'Ready-to-use agents',
        '50 requests/month',
        'Unlimited if using your own keys',
        'Private repos',
        'Multi-LLM Support',
        'Tool library',
        'Community & Email support',
        'Dedicated deployment support'
      ],
      buttonText: 'Get Started',
      borderColor: 'border-gray-200',
      buttonColor: 'bg-gray-600 hover:bg-gray-700'
    },
    {
      name: 'Individual - Pro',
      price: '39',
      description: 'For developers who want to use agents extensively in their workflow',
      features: [
        'Everything in the Free plan, plus:',
        '500 requests/month',
        'Unlimited if using your own keys',
        'Custom agents',
        'Agentic workflows',
        'Custom tools',
        'Community & Email support'
      ],
      buttonText: 'Get Started',
      borderColor: 'border-gray-200',
      buttonColor: 'bg-purple-600 hover:bg-purple-700'
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      description: 'For companies wanting to build agents at scale',
      features: [
        'Unlimited requests/month',
        'Custom agents',
        'Agentic workflows',
        'Self hosted LLMs',
        'Audit trails',
        'On prem deployment',
        'Dedicated forward deployment engineer'
      ],
      buttonText: 'Contact Us',
      borderColor: 'border-gray-200',
      buttonColor: 'bg-gray-800 hover:bg-gray-900'
    }
  ];

  const [subscription, setSubscription] = useState({
    plan: 'Unknown Plan',
    endDate: 'No end date',
    isActive: false,
    isCancelled: false
  });

  useEffect(() => {
    const fetchSubscriptionDetails = async () => {
      if (userId) {
        try {
          const data = await MinorService.fetchUserSubscription(userId);
          if (data.plan_type && data.end_date) {
            setSubscription({
              plan: getPlanDisplayName(data.plan_type),
              endDate: new Date(data.end_date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              }),
              isActive: new Date(data.end_date).getTime() > new Date().getTime(),
              isCancelled: data.is_cancelled
            });
          }
        } catch (error) {
          console.error('Error fetching subscription:', error);
        }
      }
    };

    fetchSubscriptionDetails();
  }, [userId]);

  // Convert plan type to display name
  const getPlanDisplayName = (type: string) => {
    switch(type.toLowerCase()) {
      case 'pro':
        return 'Individual - Pro';
      case 'free':
        return 'Individual - Free';
      case 'startup':
        return 'Early-Stage';
      case 'enterprise':
        return 'Enterprise';
      default:
        return 'Unknown Plan';
    }
  };

  const handleCancelSubscription = async () => {
    try {
      const data = await MinorService.cancelUserSubscription(userId);
      const fetchSubscriptionDetails = async () => {
        if (userId) {
          try {
            const data = await MinorService.fetchUserSubscription(userId);
            if (data.plan_type && data.end_date) {
              setSubscription({
                plan: getPlanDisplayName(data.plan_type),
                endDate: new Date(data.end_date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                }),
                isActive: new Date(data.end_date).getTime() > new Date().getTime(),
                isCancelled: data.is_cancelled
              });
            }
          } catch (error) {
            console.error('Error fetching subscription:', error);
          }
        }
      };
      
      await fetchSubscriptionDetails();
    } catch (error) {
      console.error('Error canceling subscription:', error);
    }
  };

  // Helper function to determine button text
  const getButtonText = (planName: string) => {
    if (planName === 'Enterprise') return 'Contact Us';
    if (planName === subscription.plan) return 'ACTIVE';
    
    // Get indices to compare current plan vs this plan
    const currentPlanIndex = plans.findIndex(p => p.name === subscription.plan);
    const thisPlanIndex = plans.findIndex(p => p.name === planName);
    
    return thisPlanIndex < currentPlanIndex ? 'Downgrade' : 'Upgrade';
  };

  const handleCheckoutRedirect = async (planType: string) => {
    console.log("planType", planType);
    try {
      const subUrl = process.env.NEXT_PUBLIC_SUBSCRIPTION_BASE_URL;
      const response = await axios.get(
        `${subUrl}/create-checkout-session?user_id=${userId}&plan_type=${planType}`,
        { headers: { 'Content-Type': 'application/json' } }
      );
      
      if (response.data.url) {
        window.location.href = response.data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Error getting checkout URL:', error);
    }
  };

  // Helper function to get plan type from name
  const getPlanType = (planName: string): string => {
    switch(planName) {
      case 'Individual - Pro': return 'pro';
      case 'Individual - Free': return 'free';
      case 'Early-Stage': return 'startup';
      case 'Enterprise': return 'enterprise';
      default: return 'free';
    }
  };

  return (
    <div className="min-h-screen bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Current Subscription Status */}
        <div className="mb-12 p-6 border rounded-lg">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
            Current Subscription
            <span className={`inline-block px-3 py-1 rounded-full text-sm ${
              subscription.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {subscription.isActive ? 'ACTIVE' : 'INACTIVE'}
            </span>
          </h2>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-lg">Plan: {subscription.plan}</p>
              <p className="text-gray-600">Expires: {subscription.endDate}</p>
            </div>
            {!subscription.isCancelled && subscription.plan !== 'Individual - Free' && (
              <button
                onClick={handleCancelSubscription}
                className="bg-white text-red-600 border border-red-600 px-4 py-2 rounded hover:bg-red-50"
              >
                Cancel Subscription
              </button>
            )}
          </div>
        </div>

        {/* Pricing Plans Grid */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan, index) => (
            <div 
              key={index} 
              className={`border rounded-lg p-6 transition-all hover:shadow-lg ${
                subscription.plan === plan.name ? 'bg-black text-white' : plan.borderColor
              }`}
              // onClick={() => setsubscription.plan(plan.name)}
            >
              <h3 className="text-lg font-semibold mb-2">{plan.name}</h3>
              <p className={`text-sm mb-4 ${subscription.plan === plan.name ? 'text-gray-300' : 'text-gray-600'}`}>
                {plan.description}
              </p>
              <div className="mb-6">
                {getButtonText(plan.name) !== 'Contact Us' && (
                  <>
                    <span className="text-4xl font-bold">${plan.price}</span>
                    <span className={subscription.plan === plan.name ? 'text-gray-300' : 'text-gray-600'}> /month</span>
                  </>
                )}
              </div>
              <Link
                href={plan.name === 'Enterprise' ? '#' : ''}
                onClick={(e) => {
                  e.preventDefault();
                  const buttonText = getButtonText(plan.name);
                  if (buttonText === 'Upgrade') {
                    handleCheckoutRedirect(getPlanType(plan.name));
                  }
                }}
                className={`${
                  subscription.plan === plan.name 
                    ? 'bg-primary hover:bg-red-700' 
                    : 'bg-white text-black border border-gray-300 hover:bg-gray-50'
                } rounded-md px-4 py-2 w-full block text-center transition-colors`}
              >
                {getButtonText(plan.name)}
              </Link>
              <ul className="mt-6 space-y-3">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start">
                    <svg
                      className={`flex-shrink-0 w-5 h-5 mt-1 ${
                        subscription.plan === plan.name ? 'text-white' : 'text-green-500'
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className={`ml-2 ${
                      subscription.plan === plan.name ? 'text-gray-300' : 'text-gray-700'
                    }`}>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PricingPage;