export function redirectToLogin(): void {
	window.history.replaceState(null, "", "/admin/login");
	window.location.reload();
}
