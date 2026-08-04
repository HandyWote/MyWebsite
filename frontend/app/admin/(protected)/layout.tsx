"use client";

import type { ComponentType, ReactNode } from "react";
import AdminLayout from "@/admin/components/AdminLayout";
import RequireAuth from "@/admin/components/RequireAuth";
import ErrorBoundary from "@/admin/components/shared/ErrorBoundary";

const AdminErrorBoundary = ErrorBoundary as ComponentType<{
	children: ReactNode;
}>;
const ProtectedAdminShell = AdminLayout as ComponentType<{
	children: ReactNode;
}>;

export default function ProtectedAdminLayout({
	children,
}: {
	children: ReactNode;
}) {
	return (
		<AdminErrorBoundary>
			<RequireAuth>
				<ProtectedAdminShell>{children}</ProtectedAdminShell>
			</RequireAuth>
		</AdminErrorBoundary>
	);
}
