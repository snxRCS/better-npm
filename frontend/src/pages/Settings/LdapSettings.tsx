import { Field, Form, Formik, FieldArray } from "formik";
import { type ReactNode, useState } from "react";
import { Alert } from "react-bootstrap";
import { Button, Loading } from "src/components";
import {
	getLdapConfig,
	updateLdapConfig,
	testLdapConnection,
	getLdapStatus,
	syncLdapUsers,
	type LdapConfig,
	type LdapConfigResponse,
	type LdapServer,
	type LdapStatusResult,
	type LdapSyncResult,
} from "src/api/backend";
import { intl, T } from "src/locale";
import { showObjectSuccess } from "src/notifications";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

function SectionHeader({ title, description }: { title: string; description?: string }) {
	return (
		<div className="mb-3">
			<h3 className="mb-1" style={{ fontSize: "1rem", fontWeight: 600 }}>
				{title}
			</h3>
			{description && (
				<p className="text-secondary mb-0" style={{ fontSize: "0.85rem" }}>
					{description}
				</p>
			)}
		</div>
	);
}

function TextInput({
	name,
	label,
	placeholder,
	type = "text",
	helpText,
}: {
	name: string;
	label: string;
	placeholder?: string;
	type?: string;
	helpText?: string;
}) {
	return (
		<Field name={name}>
			{({ field, form }: any) => (
				<div className="mb-3">
					<label className="form-label">
						{label}
						<input
							{...field}
							type={type}
							placeholder={placeholder || ""}
							autoComplete="off"
							className={`form-control ${form.errors[name] && form.touched[name] ? "is-invalid" : ""}`}
						/>
						{helpText && (
							<small className="form-hint">{helpText}</small>
						)}
						{form.errors[name] && form.touched[name] && (
							<div className="invalid-feedback">{form.errors[name]}</div>
						)}
					</label>
				</div>
			)}
		</Field>
	);
}

function NumberInput({
	name,
	label,
	min,
	max,
}: {
	name: string;
	label: string;
	min?: number;
	max?: number;
}) {
	return (
		<Field name={name}>
			{({ field, form }: any) => (
				<div className="mb-3">
					<label className="form-label">
						{label}
						<input
							{...field}
							type="number"
							min={min}
							max={max}
							className={`form-control ${form.errors[name] && form.touched[name] ? "is-invalid" : ""}`}
						/>
					</label>
				</div>
			)}
		</Field>
	);
}

function CheckboxInput({
	name,
	label,
	helpText,
}: {
	name: string;
	label: string;
	helpText?: string;
}) {
	return (
		<Field name={name}>
			{({ field, form }: any) => (
				<div className="mb-3">
					<label className="form-check">
						<input
							type="checkbox"
							className="form-check-input"
							checked={field.value}
							onChange={() => form.setFieldValue(name, !field.value)}
						/>
						<span className="form-check-label">{label}</span>
						{helpText && (
							<small className="form-hint d-block">{helpText}</small>
						)}
					</label>
				</div>
			)}
		</Field>
	);
}

const authModeOptions = [
	{
		value: "internal",
		labelId: "ldap.auth-mode.internal",
		descriptionId: "ldap.auth-mode.internal.desc",
	},
	{
		value: "internal_ldap",
		labelId: "ldap.auth-mode.internal-ldap",
		descriptionId: "ldap.auth-mode.internal-ldap.desc",
	},
	{
		value: "ldap_only",
		labelId: "ldap.auth-mode.ldap-only",
		descriptionId: "ldap.auth-mode.ldap-only.desc",
	},
];

function AuthModeSelector() {
	return (
		<Field name="authMode">
			{({ field, form }: any) => (
				<div className="mb-4">
					<label className="form-label mb-2" htmlFor="authMode" style={{ fontWeight: 600 }}>
						<T id="ldap.auth-mode" />
					</label>
					<div className="form-selectgroup form-selectgroup-boxes d-flex flex-column">
						{authModeOptions.map((option) => (
							<label className="form-selectgroup-item flex-fill" key={option.value}>
								<input
									type="radio"
									name={field.name}
									value={option.value}
									className="form-selectgroup-input"
									checked={field.value === option.value}
									onChange={(e) => form.setFieldValue(field.name, e.target.value)}
								/>
								<div className="form-selectgroup-label d-flex align-items-center p-3">
									<div className="me-3">
										<span className="form-selectgroup-check" />
									</div>
									<div>
										<strong><T id={option.labelId} /></strong>
										<div className="text-secondary" style={{ fontSize: "0.85rem" }}>
											<T id={option.descriptionId} />
										</div>
									</div>
								</div>
							</label>
						))}
					</div>
				</div>
			)}
		</Field>
	);
}

function ConnectionStatusBadge() {
	const { data: status, isLoading } = useQuery<LdapStatusResult, Error>({
		queryKey: ["ldap-status"],
		queryFn: () => getLdapStatus(),
		refetchInterval: 30000, // Poll every 30 seconds
		staleTime: 15000,
	});

	if (isLoading) {
		return (
			<span className="badge bg-secondary-lt">
				<span className="spinner-border spinner-border-sm me-1" style={{ width: "0.7rem", height: "0.7rem" }} />
				<T id="ldap.status.checking" />
			</span>
		);
	}

	if (status?.connected) {
		const serverInfo = status.totalServers && status.totalServers > 1
			? ` (${status.totalServers} ${intl.formatMessage({ id: "ldap.multi-server.servers" })})`
			: "";
		return (
			<span className="badge bg-green-lt" title={status.connectedServer || ""}>
				<span className="status-dot status-dot-animated bg-green me-1" />
				<T id="ldap.status.connected" />{serverInfo}
			</span>
		);
	}

	return (
		<span className="badge bg-red-lt">
			<span className="status-dot bg-red me-1" />
			<T id="ldap.status.disconnected" />
		</span>
	);
}

function UserSyncPanel() {
	const [syncResult, setSyncResult] = useState<LdapSyncResult | null>(null);
	const [isSyncing, setIsSyncing] = useState(false);
	const [syncError, setSyncError] = useState<string | null>(null);

	const handleSync = async () => {
		setIsSyncing(true);
		setSyncResult(null);
		setSyncError(null);
		try {
			const result = await syncLdapUsers();
			setSyncResult(result);
		} catch (err: any) {
			setSyncError(err.message || intl.formatMessage({ id: "ldap.user-sync.error" }));
		}
		setIsSyncing(false);
	};

	return (
		<div className="mb-4">
			<SectionHeader
				title={intl.formatMessage({ id: "ldap.user-sync" })}
				description={intl.formatMessage({ id: "ldap.user-sync.desc" })}
			/>
			<div className="d-flex align-items-center gap-3">
				<button
					type="button"
					className="btn btn-primary"
					disabled={isSyncing}
					onClick={handleSync}
				>
					{isSyncing ? (
						<>
							<span className="spinner-border spinner-border-sm me-2" />
							<T id="ldap.user-sync.syncing" />
						</>
					) : (
						<>
							<svg xmlns="http://www.w3.org/2000/svg" className="icon icon-tabler icon-tabler-refresh me-1" width="24" height="24" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" role="img" aria-label="Refresh"><title>Refresh</title><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M20 11a8.1 8.1 0 0 0 -15.5 -2m-.5 -4v4h4" /><path d="M4 13a8.1 8.1 0 0 0 15.5 2m.5 4v-4h-4" /></svg>
							<T id="ldap.user-sync.button" />
						</>
					)}
				</button>
			</div>

			{syncResult && (
				<Alert variant="success" className="mt-3" onClose={() => setSyncResult(null)} dismissible>
					<strong><T id="ldap.user-sync.complete" />:</strong> {syncResult.total} users — {syncResult.created} created, {syncResult.updated} updated
					{syncResult.skipped > 0 && `, ${syncResult.skipped} skipped`}
				</Alert>
			)}

			{syncError && (
				<Alert variant="danger" className="mt-3" onClose={() => setSyncError(null)} dismissible>
					<strong><T id="ldap.user-sync.failed" />:</strong> {syncError}
				</Alert>
			)}
		</div>
	);
}

const defaultConfig: LdapConfig = {
	enabled: false,
	authMode: "internal",
	host: "",
	port: 389,
	url: "",
	servers: [],
	useTls: false,
	tlsVerify: true,
	bindDn: "",
	bindPassword: "",
	baseDn: "",
	userDnTemplate: "",
	searchFilter: "(|(uid={{USERNAME}})(mail={{USERNAME}})(sAMAccountName={{USERNAME}}))",
	emailAttribute: "mail",
	nameAttribute: "displayName",
	groupAttribute: "memberOf",
	adminGroup: "",
	syncAdminGroup: false,
	autoCreateUser: true,
	ssoEnabled: false,
	ssoLogoutUrl: "",
	ssoAdminEmails: "",
	connectTimeout: 5000,
	searchTimeout: 10000,
};

const emptyServer: LdapServer = { url: "", priority: 10, label: "" };

export default function LdapSettings() {
	const queryClient = useQueryClient();
	const [errorMsg, setErrorMsg] = useState<ReactNode | null>(null);
	const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
	const [isTesting, setIsTesting] = useState(false);

	const { data, isLoading, error } = useQuery<LdapConfigResponse, Error>({
		queryKey: ["ldap-config"],
		queryFn: () => getLdapConfig(),
		staleTime: 60 * 1000,
	});

	const { mutate: saveLdapConfig, isPending: isSaving } = useMutation({
		mutationFn: (config: LdapConfig) => updateLdapConfig(config),
		onSuccess: () => {
			showObjectSuccess("setting", "saved");
			queryClient.invalidateQueries({ queryKey: ["ldap-config"] });
		},
		onError: (err: any) => {
			setErrorMsg(err.message || intl.formatMessage({ id: "ldap.save-failed" }));
		},
	});

	const handleTest = async (values: LdapConfig) => {
		setIsTesting(true);
		setTestResult(null);
		try {
			const result = await testLdapConnection(values);
			setTestResult(result);
		} catch (err: any) {
			setTestResult({
				success: false,
				message: err.message || intl.formatMessage({ id: "ldap.test-connection.failed" }),
			});
		}
		setIsTesting(false);
	};

	if (isLoading) {
		return (
			<div className="card-body">
				<Loading noLogo />
			</div>
		);
	}

	if (!isLoading && error) {
		return (
			<div className="card-body">
				<Alert variant="danger">{error.message}</Alert>
			</div>
		);
	}

	const initialValues: LdapConfig = data?.meta || defaultConfig;

	return (
		<Formik
			initialValues={initialValues}
			enableReinitialize
			onSubmit={(values) => {
				setErrorMsg(null);
				// Sync enabled flag with authMode
				const configToSave = {
					...values,
					enabled: values.authMode !== "internal",
				};
				saveLdapConfig(configToSave);
			}}
		>
			{({ values }) => (
				<Form>
					<div className="card-body">
						<Alert variant="danger" show={!!errorMsg} onClose={() => setErrorMsg(null)} dismissible>
							{errorMsg}
						</Alert>

						{testResult && (
							<Alert
								variant={testResult.success ? "success" : "danger"}
								onClose={() => setTestResult(null)}
								dismissible
							>
								<strong>{testResult.success ? intl.formatMessage({ id: "ldap.test-success" }) : intl.formatMessage({ id: "ldap.test-failed-label" })}</strong>{" "}
								{testResult.message}
							</Alert>
						)}

						{/* Authentication Mode Selector */}
						<AuthModeSelector />

						{(values.authMode === "internal_ldap" || values.authMode === "ldap_only") && (
							<>
								{/* Connection Status */}
								<hr className="my-4" />
								<div className="d-flex align-items-center justify-content-between mb-3">
									<SectionHeader
										title={intl.formatMessage({ id: "ldap.connection-status" })}
										description={intl.formatMessage({ id: "ldap.connection-status.desc" })}
									/>
									<ConnectionStatusBadge />
								</div>

								{/* User Sync */}
								<hr className="my-4" />
								<UserSyncPanel />

								{/* Connection Settings */}
								<hr className="my-4" />
								<SectionHeader
									title={intl.formatMessage({ id: "ldap.connection-settings" })}
									description={intl.formatMessage({ id: "ldap.connection-settings.desc" })}
								/>

								<div className="row">
									<div className="col-md-8">
										<TextInput
											name="host"
											label={intl.formatMessage({ id: "ldap.host" })}
											placeholder="ldap.example.com"
											helpText={intl.formatMessage({ id: "ldap.host.help" })}
										/>
									</div>
									<div className="col-md-4">
										<NumberInput
											name="port"
											label={intl.formatMessage({ id: "ldap.port" })}
											min={1}
											max={65535}
										/>
									</div>
								</div>

								<TextInput
									name="url"
									label={intl.formatMessage({ id: "ldap.url" })}
									placeholder="ldap://ldap.example.com:389 or ldaps://ldap.example.com:636"
									helpText={intl.formatMessage({ id: "ldap.url.help" })}
								/>

								<div className="row">
									<div className="col-md-6">
										<CheckboxInput
											name="useTls"
											label={intl.formatMessage({ id: "ldap.starttls" })}
											helpText={intl.formatMessage({ id: "ldap.starttls.help" })}
										/>
									</div>
									<div className="col-md-6">
										<CheckboxInput
											name="tlsVerify"
											label={intl.formatMessage({ id: "ldap.tls-verify" })}
											helpText={intl.formatMessage({ id: "ldap.tls-verify.help" })}
										/>
									</div>
								</div>

								{/* Multi-Server Failover */}
								<hr className="my-4" />
								<SectionHeader
									title={intl.formatMessage({ id: "ldap.multi-server" })}
									description={intl.formatMessage({ id: "ldap.multi-server.desc" })}
								/>

								<FieldArray name="servers">
									{({ push, remove, form }) => {
										const servers: LdapServer[] = form.values.servers || [];
										return (
											<div>
												{servers.map((_server: LdapServer, index: number) => (
													<div key={index} className="d-flex gap-2 mb-2 align-items-start">
														<div className="flex-grow-1">
															<Field
																name={`servers.${index}.url`}
																placeholder="ldap://ldap-replica.example.com:389"
																className="form-control form-control-sm"
															/>
														</div>
														<div style={{ width: "100px" }}>
															<Field
																name={`servers.${index}.priority`}
																type="number"
																min={1}
																max={99}
																className="form-control form-control-sm"
																title={intl.formatMessage({ id: "ldap.multi-server.priority.help" })}
															/>
														</div>
														<div style={{ width: "140px" }}>
															<Field
																name={`servers.${index}.label`}
																placeholder={intl.formatMessage({ id: "ldap.multi-server.label-placeholder" })}
																className="form-control form-control-sm"
															/>
														</div>
														<button
															type="button"
															className="btn btn-sm btn-outline-danger"
															onClick={() => remove(index)}
															title={intl.formatMessage({ id: "ldap.multi-server.remove" })}
														>
															<svg xmlns="http://www.w3.org/2000/svg" className="icon icon-tabler icon-tabler-trash" width="16" height="16" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" role="img" aria-label="Delete"><title>Delete</title><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 7l16 0" /><path d="M10 11l0 6" /><path d="M14 11l0 6" /><path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12" /><path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3" /></svg>
														</button>
													</div>
												))}
												{servers.length > 0 && (
													<div className="d-flex gap-2 mb-2 text-secondary" style={{ fontSize: "0.75rem" }}>
														<div className="flex-grow-1"><T id="ldap.multi-server.url" /></div>
														<div style={{ width: "100px" }}><T id="ldap.multi-server.priority" /></div>
														<div style={{ width: "140px" }}><T id="ldap.multi-server.label" /></div>
														<div style={{ width: "38px" }} />
													</div>
												)}
												<button
													type="button"
													className="btn btn-sm btn-outline-primary mt-1"
													onClick={() => push({ ...emptyServer, priority: (servers.length + 1) * 10 })}
												>
													<svg xmlns="http://www.w3.org/2000/svg" className="icon icon-tabler icon-tabler-plus me-1" width="16" height="16" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" role="img" aria-label="Add"><title>Add</title><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M12 5l0 14" /><path d="M5 12l14 0" /></svg>
													<T id="ldap.multi-server.add" />
												</button>
											</div>
										);
									}}
								</FieldArray>

								{/* Bind Settings */}
								<hr className="my-4" />
								<SectionHeader
									title={intl.formatMessage({ id: "ldap.bind-credentials" })}
									description={intl.formatMessage({ id: "ldap.bind-credentials.desc" })}
								/>

								<TextInput
									name="bindDn"
									label={intl.formatMessage({ id: "ldap.bind-dn" })}
									placeholder="cn=admin,dc=example,dc=com"
									helpText={intl.formatMessage({ id: "ldap.bind-dn.help" })}
								/>

								<TextInput
									name="bindPassword"
									label={intl.formatMessage({ id: "ldap.bind-password" })}
									type="password"
									placeholder="Service account password"
								/>

								{/* Search Settings */}
								<hr className="my-4" />
								<SectionHeader
									title={intl.formatMessage({ id: "ldap.search-settings" })}
									description={intl.formatMessage({ id: "ldap.search-settings.desc" })}
								/>

								<TextInput
									name="baseDn"
									label={intl.formatMessage({ id: "ldap.base-dn" })}
									placeholder="dc=example,dc=com"
									helpText={intl.formatMessage({ id: "ldap.base-dn.help" })}
								/>

								<TextInput
									name="userDnTemplate"
									label={intl.formatMessage({ id: "ldap.user-dn-template" })}
									placeholder="uid={{USERNAME}},ou=people,dc=example,dc=com"
									helpText={intl.formatMessage({ id: "ldap.user-dn-template.help" })}
								/>

								<TextInput
									name="searchFilter"
									label={intl.formatMessage({ id: "ldap.search-filter" })}
									placeholder="(|(uid={{USERNAME}})(mail={{USERNAME}})(sAMAccountName={{USERNAME}}))"
									helpText={intl.formatMessage({ id: "ldap.search-filter.help" })}
								/>

								{/* Attribute Mapping */}
								<hr className="my-4" />
								<SectionHeader
									title={intl.formatMessage({ id: "ldap.attribute-mapping" })}
									description={intl.formatMessage({ id: "ldap.attribute-mapping.desc" })}
								/>

								<div className="row">
									<div className="col-md-4">
										<TextInput
											name="emailAttribute"
											label={intl.formatMessage({ id: "ldap.email-attribute" })}
											placeholder="mail"
										/>
									</div>
									<div className="col-md-4">
										<TextInput
											name="nameAttribute"
											label={intl.formatMessage({ id: "ldap.name-attribute" })}
											placeholder="displayName"
											helpText={intl.formatMessage({ id: "ldap.name-attribute.help" })}
										/>
									</div>
									<div className="col-md-4">
										<TextInput
											name="groupAttribute"
											label={intl.formatMessage({ id: "ldap.group-attribute" })}
											placeholder="memberOf"
										/>
									</div>
								</div>

								{/* Group & Role Mapping */}
								<hr className="my-4" />
								<SectionHeader
									title={intl.formatMessage({ id: "ldap.group-role-mapping" })}
									description={intl.formatMessage({ id: "ldap.group-role-mapping.desc" })}
								/>

								<TextInput
									name="adminGroup"
									label={intl.formatMessage({ id: "ldap.admin-group" })}
									placeholder="cn=npm-admins,ou=groups,dc=example,dc=com"
									helpText={intl.formatMessage({ id: "ldap.admin-group.help" })}
								/>

								<CheckboxInput
									name="syncAdminGroup"
									label={intl.formatMessage({ id: "ldap.sync-admin-group" })}
									helpText={intl.formatMessage({ id: "ldap.sync-admin-group.help" })}
								/>

								<CheckboxInput
									name="autoCreateUser"
									label={intl.formatMessage({ id: "ldap.auto-create-user" })}
									helpText={intl.formatMessage({ id: "ldap.auto-create-user.help" })}
								/>

								{/* SSO / Trusted Header Auth */}
								<hr className="my-4" />
								<SectionHeader
									title={intl.formatMessage({ id: "ldap.sso" })}
									description={intl.formatMessage({ id: "ldap.sso.desc" })}
								/>

								<CheckboxInput
									name="ssoEnabled"
									label={intl.formatMessage({ id: "ldap.sso.enable" })}
									helpText={intl.formatMessage({ id: "ldap.sso.enable.help" })}
								/>

								{values.ssoEnabled && (
									<>
									<TextInput
										name="ssoAdminEmails"
										label={intl.formatMessage({ id: "ldap.sso.admin-emails" })}
										placeholder="admin@example.com, user@example.com"
										helpText={intl.formatMessage({ id: "ldap.sso.admin-emails.help" })}
									/>
									<TextInput
										name="ssoLogoutUrl"
										label={intl.formatMessage({ id: "ldap.sso.logout-url" })}
										placeholder="https://auth.example.com/logout"
										helpText={intl.formatMessage({ id: "ldap.sso.logout-url.help" })}
									/>
									<Alert variant="info" className="mt-2">
										<strong><T id="ldap.sso.setup-required" />:</strong> <T id="ldap.sso.setup-desc" />
										<ul className="mb-0 mt-2">
											<li><code>Remote-Email</code> — <T id="ldap.sso.header.email" /></li>
											<li><code>Remote-User</code> — <T id="ldap.sso.header.user" /></li>
											<li><code>Remote-Name</code> — <T id="ldap.sso.header.name" /></li>
											<li><code>Remote-Groups</code> — <T id="ldap.sso.header.groups" /></li>
										</ul>
									</Alert>
									</>
								)}

								{/* Timeouts */}
								<hr className="my-4" />
								<SectionHeader
									title={intl.formatMessage({ id: "ldap.timeouts" })}
									description={intl.formatMessage({ id: "ldap.timeouts.desc" })}
								/>

								<div className="row">
									<div className="col-md-6">
										<NumberInput
											name="connectTimeout"
											label={intl.formatMessage({ id: "ldap.connect-timeout" })}
											min={1000}
											max={30000}
										/>
									</div>
									<div className="col-md-6">
										<NumberInput
											name="searchTimeout"
											label={intl.formatMessage({ id: "ldap.search-timeout" })}
											min={1000}
											max={60000}
										/>
									</div>
								</div>
							</>
						)}
					</div>

					<div className="card-footer bg-transparent mt-auto">
						<div className="btn-list justify-content-end">
							{(values.authMode === "internal_ldap" || values.authMode === "ldap_only") && (
								<Button
									type="button"
									className="me-2"
									isLoading={isTesting}
									disabled={isTesting || isSaving}
									onClick={() => handleTest(values)}
								>
									<T id="ldap.test-connection" />
								</Button>
							)}
							<Button
								type="submit"
								actionType="primary"
								className="bg-teal"
								isLoading={isSaving}
								disabled={isTesting || isSaving}
							>
								<T id="save" />
							</Button>
						</div>
					</div>
				</Form>
			)}
		</Formik>
	);
}
