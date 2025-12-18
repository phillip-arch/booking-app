
import { GoogleGenAI, Chat } from "@google/genai";
import { ChatMessage } from '../types';

let chatSession: Chat | null = null;

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API Key missing");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const initChat = () => {
  const client = getClient();
  if (!client) return null;
  
  // Singleton pattern check logic usually handled by module scope variable above
  if (chatSession) return chatSession;

  chatSession = client.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: `You are a helpful, polite, and knowledgeable airport transfer assistant for Vienna International Airport (VIE).
      Your goal is to help customers with logistics regarding their ride.
      
      Key Policies & Service Details (Strictly adhere to these):
      - Flight Monitoring: We monitor your flight status in real-time. If delayed, we adjust pickup at no extra cost.
      - Airport Pickup Point: The driver waits in the ARRIVALS HALL, directly in front of the EXIT AT THE GATE, holding a sign with the passenger's name.
      - Waiting Time: We tolerate a few minutes of waiting time, but passengers should be ready on time.
      - Payment: Payment is made DIRECTLY TO THE DRIVER in the car (Cash or Credit Card).
      - Booking Method: Do NOT make bookings directly with the driver. All bookings must go through the app/website to be insured and guaranteed.
      - Cancellation Policy: Free cancellation up to 24 hours before pickup. Cancellations within 24 hours are charged 50%.
      
      Other Info:
      - We cover cities like Vienna, Bratislava, Brno, Graz, Linz, Parndorf, etc.
      - Vehicles: Standard Sedan, Station Wagon, and Minivan.
      - Pricing: Prices are fixed. If asked about specific prices, say "Please check the booking form for an exact quote as it depends on distance and vehicle type."
      - Give concise, reassuring answers.
      `,
    },
  });
  return chatSession;
};

export const sendMessageToGemini = async (message: string): Promise<string> => {
  if (!chatSession) {
    initChat();
  }
  
  if (!chatSession) return "I'm currently offline. Please check your connection or try again later.";

  try {
    const response = await chatSession.sendMessage({ message });
    return response.text || "I didn't catch that, could you rephrase?";
  } catch (error) {
    console.error("Gemini Error:", error);
    // Attempt re-init on error
    chatSession = null;
    return "I'm having trouble processing that request right now.";
  }
};

export const getAddressSuggestions = async (city: string, query: string): Promise<string[]> => {
  const client = getClient();
  if (!client || query.length < 3) return [];

  try {
    const locationContext = city === 'Vienna' ? 'Vienna, Austria (include all districts 1-23)' : city;

    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are an address autocomplete service. User input: "${query}". Context: "${locationContext}".
      Task: Provide 5 valid, complete street addresses or POIs in ${locationContext} that match the input. 
      Output strictly a list of strings separated by newlines. No numbering, no introductory text.`,
      config: {
        tools: [{ googleMaps: {} }],
      },
    });

    if (response.text) {
      return response.text
        .split('\n')
        .map(line => line.replace(/^[\d-]+\.\s*/, '').trim()) 
        .filter(line => line.length > 0 && !line.toLowerCase().startsWith('i found') && !line.toLowerCase().startsWith('here'));
    }
    
    return [];
  } catch (error) {
    console.error("Address prediction error", error);
    return [];
  }
};
