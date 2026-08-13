export function redirectToLogin(): void {
	window.history.replaceState(null, "", "/");
	window.location.reload();
}
