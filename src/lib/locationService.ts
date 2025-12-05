/**
 * Location Service - Get user's address using browser geolocation
 */

export interface LocationAddress {
  street: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

/**
 * Check if geolocation permissions are available and granted
 */
async function checkGeolocationPermission(): Promise<
  "granted" | "denied" | "prompt"
> {
  if (!navigator.geolocation) {
    return "denied";
  }

  // Check if Permissions API is available
  if ("permissions" in navigator) {
    try {
      const permission = await navigator.permissions.query({
        name: "geolocation" as PermissionName,
      });
      return permission.state;
    } catch (error) {
      // Permissions API might not work in all browsers, fallback to trying geolocation
      return "prompt";
    }
  }

  // Fallback: assume we can prompt
  return "prompt";
}

/**
 * Get user's current location using browser Geolocation API
 */
export async function getCurrentLocation(): Promise<{
  latitude: number;
  longitude: number;
}> {
  return new Promise(async (resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by your browser"));
      return;
    }

    // Check permission status first
    const permissionStatus = await checkGeolocationPermission();
    if (permissionStatus === "denied") {
      reject(
        new Error(
          "Location permission was previously denied. Please enable location access in your browser settings (click the lock icon in the address bar) and refresh the page."
        )
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log(
          "Location obtained:",
          position.coords.latitude,
          position.coords.longitude
        );
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error: GeolocationPositionError) => {
        console.error("Geolocation error details:", {
          code: error.code,
          message: error.message,
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
        });

        let errorMessage = "Failed to get your location.";

        // Use numeric codes (more reliable)
        if (error.code === 1) {
          // PERMISSION_DENIED
          errorMessage =
            'Location permission denied.\n\nTo fix this:\n1. Click the lock icon (🔒) in your browser address bar\n2. Find "Location" and change it to "Allow"\n3. Refresh the page and try again\n\nOr check your browser settings → Privacy → Location permissions.';
        } else if (error.code === 2) {
          // POSITION_UNAVAILABLE
          errorMessage =
            "Your location is currently unavailable. Please check your device location settings or enter address manually.";
        } else if (error.code === 3) {
          // TIMEOUT
          errorMessage = "Location request timed out. Please try again.";
        } else {
          errorMessage = `Location error: ${
            error.message ||
            "Unknown error. Please check browser console for details."
          }`;
        }

        reject(new Error(errorMessage));
      },
      {
        enableHighAccuracy: true,
        timeout: 15000, // Increased timeout
        maximumAge: 60000, // Allow cached location up to 1 minute old
      }
    );
  });
}

/**
 * Reverse geocode coordinates to address using OpenStreetMap Nominatim API
 * This is a free service, but be mindful of rate limits
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<LocationAddress> {
  try {
    // Use a more specific User-Agent as Nominatim requires it
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1&zoom=18`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "FlowboardStore/1.0 (Contact: support@flowboard.store)", // Nominatim requires a user agent
      },
    });

    if (!response.ok) {
      console.error(
        "Nominatim API error:",
        response.status,
        response.statusText
      );
      throw new Error(
        `Failed to fetch address from geocoding service (${response.status})`
      );
    }

    const data = await response.json();

    if (!data || !data.address) {
      throw new Error("No address data received from geocoding service");
    }

    const address = data.address || {};

    // Map OpenStreetMap address format to our format
    const mappedAddress = {
      street: address.road
        ? `${address.house_number || ""} ${address.road}`.trim()
        : address.house_number
        ? address.house_number
        : address.address29 || address.suburb || "",
      city:
        address.city ||
        address.town ||
        address.village ||
        address.county ||
        address.municipality ||
        "",
      state: address.state || address.region || address.province || "",
      postal_code: address.postcode || address.postal_code || "",
      country: address.country || address.country_code?.toUpperCase() || "",
    };

    return mappedAddress;
  } catch (error) {
    console.error("Reverse geocoding error:", error);
    throw new Error(
      error instanceof Error
        ? error.message
        : "Failed to convert location to address"
    );
  }
}

/**
 * Get user's address from current location
 * Combines geolocation and reverse geocoding
 */
export async function getAddressFromLocation(): Promise<LocationAddress> {
  try {
    const location = await getCurrentLocation();
    const address = await reverseGeocode(location.latitude, location.longitude);

    // Validate that we got essential address components
    if (!address.city && !address.street) {
      throw new Error(
        "Unable to determine your address from location. Please enter manually."
      );
    }

    return address;
  } catch (error) {
    throw error instanceof Error
      ? error
      : new Error("Failed to get address from location");
  }
}
