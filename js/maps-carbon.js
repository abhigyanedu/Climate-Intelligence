/**
 * EcoMind — Maps Carbon Module
 * =============================
 * Uses Google Maps JavaScript API to calculate route distance,
 * then computes CO₂ across all transport modes.
 */

const MapsCarbon = (() => {
  let _directionsService = null;
  let _autocompleteInstances = [];

  /**
   * Initialize Maps API (call after script loads).
   */
  function init() {
    const cfg = window.ECOMIND_CONFIG;
    if (!cfg || cfg.DEMO_MODE || !cfg.MAPS_API_KEY || cfg.MAPS_API_KEY.startsWith("YOUR_")) {
      console.info("[MapsCarbon] Demo mode");
      return;
    }

    if (window.google?.maps) {
      _directionsService = new window.google.maps.DirectionsService();
    } else {
      // Dynamically load the Maps script
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${cfg.MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        _directionsService = new window.google.maps.DirectionsService();
        console.info("[MapsCarbon] Maps API loaded dynamically");
      };
      document.head.appendChild(script);
    }
  }

  /**
   * Setup autocomplete on an input element.
   * @param {HTMLInputElement} el
   * @param {string} [bias='IN'] - Country bias
   */
  function setupAutocomplete(el, bias = "IN") {
    if (!window.google?.maps?.places) return;
    const ac = new window.google.maps.places.Autocomplete(el, {
      componentRestrictions: bias !== "GLOBAL" ? { country: bias } : undefined,
      fields: ["geometry", "name", "formatted_address"],
    });
    _autocompleteInstances.push(ac);
    return ac;
  }

  /**
   * Calculate distance between two locations and return CO₂ comparison.
   * @param {string} origin - address or place name
   * @param {string} destination - address or place name
   * @returns {{ distanceKm: number, comparison: Array, saved: number }}
   */
  async function calcRouteCO2(origin, destination) {
    if (!_directionsService) {
      // Demo mode — use approximate distance
      return _demoRouteResult(origin, destination);
    }

    return new Promise((resolve, reject) => {
      _directionsService.route(
        {
          origin,
          destination,
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === "ZERO_RESULTS") {
            reject(new Error("No driving route could be found between these locations."));
            return;
          }
          if (status !== "OK") {
            reject(new Error(`Maps API failed: ${status}`));
            return;
          }

          const leg = result.routes[0].legs[0];
          const distanceKm = leg.distance.value / 1000;
          const durationMin = leg.duration.value / 60;

          const comparison = CarbonEngine.compareTransportModes(distanceKm);
          const maxCO2 = comparison[comparison.length - 1]?.co2 || 1;
          const minCO2 = comparison[0]?.co2 || 0;

          resolve({
            distanceKm: parseFloat(distanceKm.toFixed(1)),
            durationMin: Math.round(durationMin),
            originAddress: leg.start_address,
            destinationAddress: leg.end_address,
            comparison,
            maxSaving: parseFloat((maxCO2 - minCO2).toFixed(2)),
            getTreeSavings: (selectedModeCO2) => {
              const carCO2 = comparison.find(m => m.mode === 'petrol_car_solo')?.co2 || maxCO2;
              const savedKg = Math.max(0, carCO2 - selectedModeCO2);
              // 1 tree absorbs ~22kg of CO2 per year. 
              return parseFloat((savedKg / 22).toFixed(3));
            }
          });
        }
      );
    });
  }

  // ─────────────────────────────────────────────────────────────
  // DEMO
  // ─────────────────────────────────────────────────────────────
  function _demoRouteResult(origin, destination) {
    const distanceKm = 12.4; // Typical city commute
    const comparison = CarbonEngine.compareTransportModes(distanceKm);
    const maxCO2 = comparison[comparison.length - 1]?.co2 || 1;
    const minCO2 = comparison[0]?.co2 || 0;

    return {
      distanceKm,
      durationMin: 28,
      originAddress: origin || "Koramangala, Bengaluru",
      destinationAddress: destination || "Whitefield, Bengaluru",
      comparison,
      maxSaving: parseFloat((maxCO2 - minCO2).toFixed(2)),
      getTreeSavings: (selectedModeCO2) => {
        const carCO2 = comparison.find(m => m.mode === 'petrol_car_solo')?.co2 || maxCO2;
        const savedKg = Math.max(0, carCO2 - selectedModeCO2);
        return parseFloat((savedKg / 22).toFixed(3));
      }
    };
  }

  return { init, setupAutocomplete, calcRouteCO2 };
})();

window.MapsCarbon = MapsCarbon;
