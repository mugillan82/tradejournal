// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { signIn } from "@/lib/auth/client";

vi.mock("@/lib/auth/client", () => ({
  signIn: {
    social: vi.fn(),
  },
}));

describe("GoogleSignInButton Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders default text and attributes", () => {
    render(<GoogleSignInButton />);

    const button = screen.getByTestId("google-signin-button");
    expect(button).toBeTruthy();
    expect(button.textContent).toContain("Continue with Google");
  });

  it("renders custom text", () => {
    render(<GoogleSignInButton text="Sign up with Google" />);

    const button = screen.getByTestId("google-signin-button");
    expect(button.textContent).toContain("Sign up with Google");
  });

  it("triggers signIn.social with provider 'google' and callback URL on click", async () => {
    (signIn.social as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { url: "https://accounts.google.com/o/oauth2/v2/auth" },
    });

    render(<GoogleSignInButton callbackUrl="/trades" />);

    const button = screen.getByTestId("google-signin-button");
    fireEvent.click(button);

    expect(signIn.social).toHaveBeenCalledWith({
      provider: "google",
      callbackURL: "/trades",
    });
  });

  it("calls onError callback when sign-in fails", async () => {
    (signIn.social as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("Network error"),
    );

    const onErrorMock = vi.fn();
    render(<GoogleSignInButton onError={onErrorMock} />);

    const button = screen.getByTestId("google-signin-button");
    fireEvent.click(button);

    await waitFor(() => {
      expect(onErrorMock).toHaveBeenCalledWith(
        "Could not connect to Google. Please try again.",
      );
    });
  });

  it("calls onError with a helpful message when provider is not configured", async () => {
    (signIn.social as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      error: { message: "Provider not found" },
    });

    const onErrorMock = vi.fn();
    render(<GoogleSignInButton onError={onErrorMock} />);

    const button = screen.getByTestId("google-signin-button");
    fireEvent.click(button);

    await waitFor(() => {
      expect(onErrorMock).toHaveBeenCalledWith(
        "Google Sign-In is not configured on this deployment. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your environment variables.",
      );
    });
  });

  it("disables button when disabled prop is true", () => {
    render(<GoogleSignInButton disabled={true} />);

    const button = screen.getByTestId("google-signin-button") as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });
});
