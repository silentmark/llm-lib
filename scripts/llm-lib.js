/*
 * Class that holds constants - not the API key?
 */
class llmSettings {
  static ID = "llm-lib";

  static SETTINGS = {
    API_KEY: "api_key",
    KEYS: "keys"
  };

  static TEMPLATES = {
    CHATBOT: `modules/${this.ID}/templates/llm-lib.hbs`,
  };


  /**
   * A small helper function which leverages developer mode flags to gate debug logs.
   *
   * @param {boolean} force - forces the log even if the debug flag is not on
   * @param  {...any} args - what to log
   */
  static log(force, ...args) {
    const shouldLog =
      force ||
      game.modules.get("_dev-mode")?.api?.getPackageDebugValue(this.ID);

    if (shouldLog) {
      console.log(this.ID, "|", ...args);
    }
  }

  static initialize() {
    this.llmSettings = new llmSettings();

    game.settings.register(this.ID, this.SETTINGS.API_KEY, {
      name: `CHAT-BOT.settings.${this.SETTINGS.API_KEY}.Name`,
      default: "",
      type: String,
      scope: "world", // or is it 'client'?
      config: true,
      restricted: true,
      hint: `CHAT-BOT.settings.${this.SETTINGS.API_KEY}.Hint`,
      onChange: () => {}, // Probably don't need this if I can just grab it from game.settings.get. Instead in future this could be a way to let me know something has changed
    });
  }
}

/**
 * Register our module's debug flag with developer mode's custom hook
 */
Hooks.once("devModeReady", ({ registerPackageDebugFlag }) => {
  registerPackageDebugFlag(llm.ID);
});

/*
 *
 */

class llmLib {
    static async callLlm(llmQuery) {
        const OPENAI_API_KEY = game.settings.get(`${llmSettings.ID}`, `${llmSettings.SETTINGS.API_KEY}`); // Replace with your actual API key
        const url = 'https://api.openai.com/v1/chat/completions';

        const data = {
            model: "gpt-4-turbo-preview",
            response_format: { type: "json_object" },
            messages: [{ "role": "system", "content": llmLib.helpfulAssistant },
                        {"role": "user", "content": llmQuery }]
            };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
                });
            
            const responseData = await response.json();
            let actorData = responseData.choices[0].message.content;
            actorData = JSON.parse(actorData);
            return actorData;
        } catch (error) {
            console.error('Error:', error);
            return null;
        }
  }

  static async callDallE(llmQuery) {
      const OPENAI_API_KEY = game.settings.get(`${llmSettings.ID}`, `${llmSettings.SETTINGS.API_KEY}`);
      const url = 'https://api.openai.com/v1/images/generations';
  
      const data = {
          model: "dall-e-3", // Ensure this is the correct model identifier
          prompt: "A portrait of " + llmQuery,
          n: 1, // Number of images to generate
          size: "1024x1024", // Desired size of the image
          response_format: "b64_json"
      };
  
      try {
          const response = await fetch(url, {
              method: 'POST',
              headers: {
                  'Authorization': `Bearer ${OPENAI_API_KEY}`,
                  'Content-Type': 'application/json'
              },
              body: JSON.stringify(data)
          });
  
          const responseData = await response.json();
          console.log(responseData);
          return responseData.data[0].b64_json; // Adjust based on actual response
      } catch (error) {
          console.error('Error:', error);
          return null;
      }
  }

  static async callChat(messages) {
    const OPENAI_API_KEY = game.settings.get(`${llmSettings.ID}`, `${llmSettings.SETTINGS.API_KEY}`);
        const url = 'https://api.openai.com/v1/chat/completions';
    
        const data = {
            model: "gpt-4-turbo-preview",
            messages: [{ "role": "system", "content": 'Jesteś pomocnym i kreatywnym asystentem Mistrza Gry w 4. edycji Warhammer Fantasy RPG. Pomagasz, pisząc  dla Mistrza Gry historię i opisy postaci w języku polskim' }, ...messages]
        };
    
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            
            const responseData = await response.json();
            let message = responseData.choices[0].message.content;
            return message;
        } catch (error) {
            console.error('Error:', error);
            return null;
        }
  }

  static callPredetermined() {
    return this.elara;
  }

  static callPredeterminedImg() {
    return this.b64;
  }

  static helpfulAssistant = `
 Jesteś pomocnym i kreatywnym asystentem Mistrza Gry w 4. edycji Warhammer Fantasy RPG. Pomagasz, podając opisy i podstawowe cechy dla NPC w określonym formacie JSON. Wyjście będzie zawierać serię cech bohatera niezależnego, krótki opis, który byłby odpowiedni do dalszych zapytań i generowania obrazu GPT z Dall-E, historię, przedmioty, ataki, zaklęcia i zbroję, które mogą być istotne dla postaci (nie bój się dodać wiele) oraz wszelkie powiązania lub relacje. Wydasz tylko wymagane atrybuty w języku polskim, bez zbędnych dodatków. Opis dla Dall-E będzie zawierał "A portrait of " przed imieniem postaci i będzie w języku angielskim.
{
  "npc": {
    "name": "",
    "type": "npc",
    "system": {
      "characteristics": {
        "ws": { "value": "" },
        "bs": { "value": "" },
        "s": { "value": "" },
        "t": { "value": "" },
        "i": { "value": "" },
        "ag": { "value": "" },
        "dex": { "value": "" },
        "int": { "value": "" },
        "wp": { "value": "" },
        "fel": { "value": "" }
      },
      "skills": [],
      "talents": [],
      "careers": [],
      "items": [],
      "spells": [],
      "details": {
        "biography": { "value": "" },
        "description": { "value": "" },
        "species": { "value": "" },
        "gender": { "value": "" }
      }
    }
  },
  "dalle": "A portrait of "
}
`;
}

// Initialize llmSettings
Hooks.once("init", () => {
  llmSettings.initialize();
});

// Example of a GET request using fetch in FoundryVTT
fetch("http://json.schemastore.org/launchsettings.json")
  .then((response) => {
    // Check if the request was successful
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return response.json();
  })
  .then((data) => {
    console.log("Data fetched:", data);
    // Handle the data here
  })
  .catch((error) => {
    console.error("Fetch error:", error);
  });
